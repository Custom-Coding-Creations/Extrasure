import { createBookingCheckout } from "@/lib/service-booking";

jest.mock("@/lib/service-catalog", () => ({
  ensureServiceCatalogSeeded: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    serviceCatalogItem: {
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    serviceBooking: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        serviceBooking: {
          update: jest.fn(),
        },
        customer: {
          update: jest.fn(),
        },
      };

      return callback(tx);
    }),
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    serviceCatalogItem: {
      findUnique: jest.Mock;
    };
    customer: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    invoice: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    serviceBooking: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
};

describe("service-booking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates booking checkout for valid inputs", async () => {
    prisma.serviceBooking.findFirst.mockResolvedValue(null);
    prisma.serviceCatalogItem.findUnique.mockResolvedValue({
      id: "svc_1",
      active: true,
      amount: 189,
      billingCycle: "one_time",
    });
    prisma.customer.findFirst.mockResolvedValue(null);
    prisma.customer.create.mockResolvedValue({
      id: "c_123",
    });
    prisma.invoice.create.mockResolvedValue({
      id: "inv_123",
    });
    prisma.serviceBooking.create.mockResolvedValue({
      id: "book_123",
    });

    const result = await createBookingCheckout({
      serviceCatalogItemId: "svc_1",
      contactName: "Megan R",
      contactEmail: "megan@example.com",
      contactPhone: "315-555-0100",
      preferredDate: "2099-01-02",
      preferredWindow: "morning",
      addressLine1: "123 Main St",
      city: "Syracuse",
      notes: "Gate on left",
    });

    expect(prisma.invoice.create).toHaveBeenCalled();
    expect(prisma.serviceBooking.create).toHaveBeenCalled();
    expect(result.checkoutUrl).toBe("/book/checkout/book_123?invoice=inv_123");
    expect(result.reusedCheckout).toBe(false);
  });

  it("reuses existing active checkout session for duplicate submissions", async () => {
    prisma.serviceBooking.findFirst.mockResolvedValue({
      id: "book_existing",
      invoiceId: "inv_existing",
    });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_existing",
      status: "open",
    });

    const result = await createBookingCheckout({
      serviceCatalogItemId: "svc_1",
      contactName: "Megan R",
      contactEmail: "megan@example.com",
      contactPhone: "315-555-0100",
      preferredDate: "2099-01-02",
      preferredWindow: "morning",
      addressLine1: "123 Main St",
      city: "Syracuse",
      notes: "Gate on left",
    });

    expect(prisma.customer.create).not.toHaveBeenCalled();
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.serviceBooking.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      bookingId: "book_existing",
      invoiceId: "inv_existing",
      checkoutUrl: "/book/checkout/book_existing?invoice=inv_existing",
      reusedCheckout: true,
    });
  });

  it("rejects booking with past preferred date", async () => {
    await expect(
      createBookingCheckout({
        serviceCatalogItemId: "svc_1",
        contactName: "Megan R",
        contactEmail: "megan@example.com",
        contactPhone: "315-555-0100",
        preferredDate: "2000-01-02",
        preferredWindow: "morning",
        addressLine1: "123 Main St",
        city: "Syracuse",
      }),
    ).rejects.toThrow(/cannot be in the past/i);
  });
});
