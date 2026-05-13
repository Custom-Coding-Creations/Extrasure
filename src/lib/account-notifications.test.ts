import {
  dismissCustomerAccountNotification,
  getCustomerAccountNotificationPreferences,
  listActiveCustomerAccountNotifications,
  markAllCustomerAccountNotificationsRead,
  setCustomerAccountNotificationPreference,
  snoozeCustomerAccountNotification,
  syncCustomerAccountNotifications,
} from "@/lib/account-notifications";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customerAccountNotification: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    customerNotificationPreference: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customerAccountNotification: {
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    customerNotificationPreference: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };
};

function createSnapshot(overrides?: Partial<CustomerAccountSnapshot>): CustomerAccountSnapshot {
  return {
    customer: {
      id: "customer_123",
      name: "Jordan Avery",
      email: "jordan@example.com",
      phone: "555-0100",
      addressLine1: null,
      addressLine2: null,
      city: "Austin",
      stateProvince: null,
      postalCode: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      lastServiceDate: new Date("2024-01-10T00:00:00.000Z"),
      lifecycle: "past_due",
      activePlan: "monthly",
    },
    invoices: [],
    payments: [],
    jobs: [],
    bookings: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as unknown as CustomerAccountSnapshot;
}

describe("account-notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customerAccountNotification.findMany.mockResolvedValue([]);
    prisma.customerAccountNotification.update.mockResolvedValue({ id: "updated" });
    prisma.customerAccountNotification.create.mockResolvedValue({ id: "created" });
    prisma.customerAccountNotification.updateMany.mockResolvedValue({ count: 1 });
    prisma.customerNotificationPreference.findMany.mockResolvedValue([]);
    prisma.customerNotificationPreference.upsert.mockResolvedValue({ id: "pref_1" });
  });

  it("creates new persisted notifications and resolves stale ones during sync", async () => {
    prisma.customerAccountNotification.findMany.mockResolvedValue([
      {
        id: "notif_stale",
        customerId: "customer_123",
        sourceKey: "account_healthy",
        resolvedAt: null,
      },
    ]);

    await syncCustomerAccountNotifications(
      createSnapshot({
        invoices: [
          {
            id: "inv_1",
            amount: 189,
            status: "open",
            dueDate: new Date("2026-05-20T00:00:00.000Z"),
          },
        ],
      }),
    );

    const createdSourceKeys = prisma.customerAccountNotification.create.mock.calls.map(
      ([payload]: [{ data: { sourceKey: string } }]) => payload.data.sourceKey,
    );

    expect(createdSourceKeys).toEqual(expect.arrayContaining([
      "protection_risk",
      "billing_open_balance",
      "visit_missing",
      "profile_incomplete",
    ]));
    expect(prisma.customerAccountNotification.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["notif_stale"],
        },
      },
      data: expect.objectContaining({
        resolvedAt: expect.any(Date),
        snoozedUntil: null,
      }),
    });
  });

  it("reactivates a resolved notification when the condition returns", async () => {
    prisma.customerAccountNotification.findMany.mockResolvedValue([
      {
        id: "notif_visit",
        customerId: "customer_123",
        sourceKey: "visit_missing",
        resolvedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    ]);

    await syncCustomerAccountNotifications(createSnapshot());

    expect(prisma.customerAccountNotification.update).toHaveBeenCalledWith({
      where: { id: "notif_visit" },
      data: expect.objectContaining({
        resolvedAt: null,
        dismissedAt: null,
        readAt: null,
      }),
    });
  });

  it("lists active notifications with unread items first", async () => {
    prisma.customerAccountNotification.findMany.mockResolvedValue([
      {
        id: "notif_read",
        tone: "info",
        title: "Read notice",
        detail: "Already read",
        href: "/account",
        createdAt: new Date("2026-05-10T00:00:00.000Z"),
        updatedAt: new Date("2026-05-12T00:00:00.000Z"),
        readAt: new Date("2026-05-12T01:00:00.000Z"),
      },
      {
        id: "notif_unread",
        tone: "warning",
        title: "Unread notice",
        detail: "Needs attention",
        href: "/account/billing",
        createdAt: new Date("2026-05-11T00:00:00.000Z"),
        updatedAt: new Date("2026-05-11T12:00:00.000Z"),
        readAt: null,
      },
    ]);

    const result = await listActiveCustomerAccountNotifications("customer_123");

    expect(prisma.customerAccountNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: "customer_123",
          dismissedAt: null,
          resolvedAt: null,
          OR: expect.any(Array),
          AND: expect.any(Array),
        }),
      }),
    );

    expect(result[0]?.id).toBe("notif_unread");
    expect(result[0]?.readAt).toBeNull();
    expect(result[1]?.id).toBe("notif_read");
  });

  it("marks all active notifications as read for the current customer", async () => {
    await markAllCustomerAccountNotificationsRead("customer_123");

    expect(prisma.customerAccountNotification.updateMany).toHaveBeenCalledWith({
      where: {
        customerId: "customer_123",
        dismissedAt: null,
        resolvedAt: null,
        readAt: null,
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  it("dismisses a notification within the current customer scope", async () => {
    prisma.customerAccountNotification.updateMany.mockResolvedValue({ count: 1 });

    await expect(dismissCustomerAccountNotification("customer_123", "notif_1")).resolves.toBe(true);

    expect(prisma.customerAccountNotification.updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif_1",
        customerId: "customer_123",
        resolvedAt: null,
        dismissedAt: null,
      },
      data: {
        dismissedAt: expect.any(Date),
        readAt: expect.any(Date),
      },
    });
  });

  it("snoozes a notification for the requested duration", async () => {
    prisma.customerAccountNotification.updateMany.mockResolvedValue({ count: 1 });

    await expect(snoozeCustomerAccountNotification("customer_123", "notif_1", 24)).resolves.toBe(true);

    expect(prisma.customerAccountNotification.updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif_1",
        customerId: "customer_123",
        resolvedAt: null,
        dismissedAt: null,
      },
      data: {
        snoozedUntil: expect.any(Date),
        readAt: expect.any(Date),
      },
    });
  });

  it("rejects invalid snooze durations", async () => {
    await expect(snoozeCustomerAccountNotification("customer_123", "notif_1", 0)).resolves.toBe(false);
    expect(prisma.customerAccountNotification.updateMany).not.toHaveBeenCalled();
  });

  it("returns default and stored notification preferences", async () => {
    prisma.customerNotificationPreference.findMany.mockResolvedValue([
      {
        sourceKey: "billing_open_balance",
        enabled: false,
      },
    ]);

    const preferences = await getCustomerAccountNotificationPreferences("customer_123");
    const billingPreference = preferences.find((item) => item.sourceKey === "billing_open_balance");
    const riskPreference = preferences.find((item) => item.sourceKey === "protection_risk");

    expect(billingPreference?.enabled).toBe(false);
    expect(riskPreference?.enabled).toBe(true);
  });

  it("upserts notification preference values for known source keys", async () => {
    await expect(setCustomerAccountNotificationPreference("customer_123", "visit_missing", false)).resolves.toBe(true);

    expect(prisma.customerNotificationPreference.upsert).toHaveBeenCalledWith({
      where: {
        customerId_sourceKey: {
          customerId: "customer_123",
          sourceKey: "visit_missing",
        },
      },
      update: {
        enabled: false,
      },
      create: expect.objectContaining({
        customerId: "customer_123",
        sourceKey: "visit_missing",
        enabled: false,
      }),
    });
  });

  it("rejects preference updates for unknown source keys", async () => {
    await expect(setCustomerAccountNotificationPreference("customer_123", "unknown_source", false)).resolves.toBe(false);
    expect(prisma.customerNotificationPreference.upsert).not.toHaveBeenCalled();
  });
});