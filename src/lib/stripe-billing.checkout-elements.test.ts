import { createInvoiceCheckoutElementsSession } from "@/lib/stripe-billing";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    customers: {
      create: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    invoice: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
};

const { stripe } = jest.requireMock("@/lib/stripe") as {
  stripe: {
    checkout: {
      sessions: {
        create: jest.Mock;
      };
    };
    customers: {
      create: jest.Mock;
    };
  };
};

describe("createInvoiceCheckoutElementsSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prisma.customer.findUnique.mockResolvedValue({
      id: "cust_1",
      name: "Test Customer",
      email: "test@example.com",
      phone: "555-0100",
      stripeCustomerId: "cus_123",
    });

    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      client_secret: "cs_test_secret",
      payment_intent: "pi_123",
    });

    prisma.invoice.update.mockResolvedValue({ id: "inv_1" });
  });

  it("omits setup_future_usage when savePaymentMethod=false for one-time checkout", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      customerId: "cust_1",
      amount: 199,
      billingCycle: "one_time",
      status: "open",
    });

    await createInvoiceCheckoutElementsSession("inv_1", {
      savePaymentMethod: false,
      context: "customer",
    });

    const sessionConfig = stripe.checkout.sessions.create.mock.calls[0][0];

    expect(sessionConfig.mode).toBe("payment");
    expect(sessionConfig.payment_intent_data.metadata).toMatchObject({
      localInvoiceId: "inv_1",
      localCustomerId: "cust_1",
      billingCycle: "one_time",
    });
    expect(sessionConfig.payment_intent_data).not.toHaveProperty("setup_future_usage");
  });

  it("defaults to setup_future_usage=off_session for one-time checkout", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      customerId: "cust_1",
      amount: 199,
      billingCycle: "one_time",
      status: "open",
    });

    await createInvoiceCheckoutElementsSession("inv_1", { context: "customer" });

    const sessionConfig = stripe.checkout.sessions.create.mock.calls[0][0];

    expect(sessionConfig.mode).toBe("payment");
    expect(sessionConfig.payment_intent_data.setup_future_usage).toBe("off_session");
  });

  it("uses subscription_data for recurring checkouts and ignores one-time setup semantics", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv_2",
      customerId: "cust_1",
      amount: 99,
      billingCycle: "monthly",
      status: "open",
    });

    await createInvoiceCheckoutElementsSession("inv_2", {
      savePaymentMethod: false,
      context: "customer",
    });

    const sessionConfig = stripe.checkout.sessions.create.mock.calls[0][0];

    expect(sessionConfig.mode).toBe("subscription");
    expect(sessionConfig).toHaveProperty("subscription_data");
    expect(sessionConfig).not.toHaveProperty("payment_intent_data");
  });
});
