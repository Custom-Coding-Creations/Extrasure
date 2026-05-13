import {
  applyAchDiscountIfEligible,
  attachPaymentMethodPreference,
  getPaymentElementOptionsForAch,
} from "@/lib/stripe-billing";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/payment-preferences", () => ({
  calculateAchDiscount: jest.fn(),
  isAchDiscountEligible: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
  stripe: {
    paymentIntents: {
      update: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      findUnique: jest.Mock;
    };
  };
};

const { stripe } = jest.requireMock("@/lib/stripe") as {
  stripe: {
    paymentIntents: {
      update: jest.Mock;
    };
  };
};

const { calculateAchDiscount, isAchDiscountEligible } = jest.requireMock("@/lib/payment-preferences") as {
  calculateAchDiscount: jest.Mock;
  isAchDiscountEligible: jest.Mock;
};

describe("stripe-billing ACH helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customer.findUnique.mockResolvedValue({
      preferredPaymentMethod: "none",
      achDiscountEligible: false,
    });
    isAchDiscountEligible.mockResolvedValue(false);
    calculateAchDiscount.mockReturnValue({
      originalAmount: 100,
      discountedAmount: 97,
      savingsAmount: 3,
      savings_percentage: 3,
    });
    stripe.paymentIntents.update.mockResolvedValue({ id: "pi_1" });
  });

  it("does not apply ACH discount when customer is not eligible", async () => {
    const result = await applyAchDiscountIfEligible("pi_1", "c_1", 100);

    expect(result).toEqual({
      applied: false,
      discountedAmount: 100,
    });
    expect(stripe.paymentIntents.update).not.toHaveBeenCalled();
  });

  it("applies ACH discount and updates payment intent metadata when eligible", async () => {
    isAchDiscountEligible.mockResolvedValue(true);

    const result = await applyAchDiscountIfEligible("pi_1", "c_1", 100);

    expect(stripe.paymentIntents.update).toHaveBeenCalledWith("pi_1", {
      amount: 9700,
      metadata: {
        achDiscountApplied: "true",
        achSavingsAmount: "3",
        achOriginalAmount: "100",
      },
    });
    expect(result).toEqual({
      applied: true,
      discountedAmount: 97,
    });
  });

  it("attaches preferred payment method metadata to payment intent", async () => {
    await attachPaymentMethodPreference("pi_1", "ach");

    expect(stripe.paymentIntents.update).toHaveBeenCalledWith("pi_1", {
      metadata: {
        preferredPaymentMethod: "ach",
      },
    });
  });

  it("prioritizes ACH methods in payment element options when preferred or eligible", async () => {
    prisma.customer.findUnique.mockResolvedValue({
      preferredPaymentMethod: "ach",
      achDiscountEligible: true,
    });

    const options = await getPaymentElementOptionsForAch("c_1", false);

    expect(options.paymentMethodOrder).toEqual(["us_bank_account", "card"]);
    expect(options.terms?.usBankAccount).toBe("auto");
  });

  it("keeps card-first order for non-eligible customers", async () => {
    prisma.customer.findUnique.mockResolvedValue({
      preferredPaymentMethod: "none",
      achDiscountEligible: false,
    });

    const options = await getPaymentElementOptionsForAch("c_1", true);

    expect(options.paymentMethodOrder).toEqual(["card", "us_bank_account"]);
    expect(options.terms?.usBankAccount).toBe("always");
  });
});
