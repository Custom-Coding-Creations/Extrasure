import { getCustomerStripeInvoiceDocumentLinks } from "@/lib/stripe-billing";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
  stripe: {
    invoices: {
      retrieve: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    invoice: {
      findUnique: jest.Mock;
    };
  };
};

const { stripe } = jest.requireMock("@/lib/stripe") as {
  stripe: {
    invoices: {
      retrieve: jest.Mock;
    };
  };
};

describe("getCustomerStripeInvoiceDocumentLinks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when invoice does not exist", async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);

    await expect(getCustomerStripeInvoiceDocumentLinks("c_1", "inv_1")).rejects.toThrow("Invoice not found");
  });

  it("throws when invoice does not belong to customer", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      customerId: "c_other",
      stripeInvoiceId: "in_1",
    });

    await expect(getCustomerStripeInvoiceDocumentLinks("c_1", "inv_1")).rejects.toThrow("Invoice not found");
  });

  it("returns null document links when stripe invoice is not linked", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      customerId: "c_1",
      stripeInvoiceId: null,
    });

    const result = await getCustomerStripeInvoiceDocumentLinks("c_1", "inv_1");

    expect(result).toEqual({
      stripeInvoiceId: null,
      hostedInvoiceUrl: null,
      pdfUrl: null,
    });
    expect(stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("returns hosted and pdf links for authorized customer invoice", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      customerId: "c_1",
      stripeInvoiceId: "in_123",
    });
    stripe.invoices.retrieve.mockResolvedValue({
      id: "in_123",
      hosted_invoice_url: "https://billing.stripe.com/i/inv_hosted",
      invoice_pdf: "https://files.stripe.com/invoice.pdf",
    });

    const result = await getCustomerStripeInvoiceDocumentLinks("c_1", "inv_1");

    expect(stripe.invoices.retrieve).toHaveBeenCalledWith("in_123");
    expect(result).toEqual({
      stripeInvoiceId: "in_123",
      hostedInvoiceUrl: "https://billing.stripe.com/i/inv_hosted",
      pdfUrl: "https://files.stripe.com/invoice.pdf",
    });
  });
});
