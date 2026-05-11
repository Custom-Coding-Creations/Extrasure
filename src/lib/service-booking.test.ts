import { createBookingCheckout } from "@/lib/service-booking";

jest.mock("@/lib/service-catalog", () => ({
  ensureServiceCatalogSeeded: jest.fn(),
}));

jest.mock("@/lib/stripe-billing", () => ({
  createInvoiceCheckoutSession: jest.fn(),
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
    };
    serviceBooking: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
};

const { createInvoiceCheckoutSession } = jest.requireMock("@/lib/stripe-billing") as {
  createInvoiceCheckoutSession: jest.Mock;
};

describe("service-booking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates booking checkout for valid inputs", async () => {
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
    createInvoiceCheckoutSession.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/session",
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
    expect(createInvoiceCheckoutSession).toHaveBeenCalledWith(
      "inv_123",
      expect.objectContaining({ context: "customer" }),
    );
    expect(result.checkoutUrl).toBe("https://checkout.stripe.test/session");
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
