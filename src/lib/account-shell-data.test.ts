import { buildAccountShellState } from "@/lib/account-shell-data";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

jest.mock("@/lib/account-notifications", () => ({
  getPersistedAccountNotificationsForSnapshot: jest.fn(async () => [
    {
      id: "persisted_1",
      tone: "warning",
      title: "Persisted notification",
      detail: "Stored notification detail",
      href: "/account",
      readAt: null,
      createdAt: "2026-05-12T00:00:00.000Z",
    },
  ]),
}));

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
      lastServiceDate: null,
      lifecycle: "active",
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

describe("account-shell-data", () => {
  it("builds risk-aware home shell state from open billing and service gaps", async () => {
    const snapshot = createSnapshot({
      customer: {
        ...createSnapshot().customer,
        lifecycle: "past_due",
        lastServiceDate: new Date("2024-01-10T00:00:00.000Z"),
      },
      invoices: [
        {
          id: "inv_1",
          amount: 189,
          status: "open",
          dueDate: new Date("2024-02-10T00:00:00.000Z"),
        },
      ],
    });

    const state = await buildAccountShellState(snapshot, "home");

    expect(state.quickActions[1]?.label).toBe("Resolve 1 billing item");
    expect(state.notifications[0]?.title).toBe("Persisted notification");
  });

  it("builds service shell state that prompts scheduling when no visit exists", async () => {
    const snapshot = createSnapshot();

    const state = await buildAccountShellState(snapshot, "services");

    expect(state.quickActions[0]?.label).toBe("Request a protection visit");
    expect(state.notifications[0]?.tone).toBe("warning");
    expect(state.notifications[0]?.title).toBe("Persisted notification");
  });

  it("builds profile shell state that highlights missing property details", async () => {
    const snapshot = createSnapshot({
      customer: {
        ...createSnapshot().customer,
        lastServiceDate: new Date("2024-11-15T00:00:00.000Z"),
      },
    });

    const state = await buildAccountShellState(snapshot, "profile");

    expect(state.quickActions[0]?.label).toBe("Add property address details");
    expect(state.notifications[0]?.tone).toBe("warning");
    expect(state.notifications[0]?.title).toBe("Persisted notification");
  });
});