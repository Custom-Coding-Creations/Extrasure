import { handleStripeEvent } from "@/lib/stripe-billing";

jest.mock("@/lib/payment-preferences", () => ({
  syncSavedPaymentMethodsFromStripe: jest.fn(),
}));

jest.mock("@/lib/customer-billing-access", () => ({
  createInvoiceAccessToken: jest.fn(() => "token"),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findFirst: jest.fn(),
    },
    serviceBooking: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        invoice: {
          update: jest.fn(),
        },
        payment: {
          update: jest.fn(),
          create: jest.fn(),
        },
        customer: {
          updateMany: jest.fn(),
        },
      };

      return callback(tx);
    }),
  },
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
  stripe: {
    paymentIntents: {
      retrieve: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    payment: {
      findFirst: jest.Mock;
    };
    serviceBooking: {
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
};

const { stripe } = jest.requireMock("@/lib/stripe") as {
  stripe: {
    paymentIntents: {
      retrieve: jest.Mock;
    };
  };
};

const { syncSavedPaymentMethodsFromStripe } = jest.requireMock("@/lib/payment-preferences") as {
  syncSavedPaymentMethodsFromStripe: jest.Mock;
};

describe("stripe booking sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks linked bookings as requested when checkout session succeeds", async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    stripe.paymentIntents.retrieve.mockResolvedValue({
      latest_charge: "ch_123",
      payment_method_types: ["card"],
      last_payment_error: null,
    });

    await handleStripeEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: {
            localInvoiceId: "inv_123",
            localCustomerId: "c_123",
          },
          payment_intent: "pi_123",
          customer: "cus_123",
          subscription: "sub_123",
          amount_total: 18900,
          url: "https://checkout.stripe.com/session",
        },
      },
    } as never);

    expect(prisma.serviceBooking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          invoiceId: "inv_123",
          status: {
            in: ["checkout_pending", "checkout_completed", "requested"],
          },
        },
        data: expect.objectContaining({
          status: "requested",
          stripeCheckoutSessionId: "cs_123",
          stripeSubscriptionId: "sub_123",
        }),
      }),
    );
    expect(syncSavedPaymentMethodsFromStripe).toHaveBeenCalledWith("cus_123");
  });

  it("syncs payment methods when payment_method.attached is received", async () => {
    await handleStripeEvent({
      type: "payment_method.attached",
      data: {
        object: {
          id: "pm_123",
          customer: "cus_999",
        },
      },
    } as never);

    expect(syncSavedPaymentMethodsFromStripe).toHaveBeenCalledWith("cus_999");
  });
});
