import { PaymentPreferenceMethod, PaymentMethod } from "@prisma/client";
import {
  calculateAchDiscount,
  disableAutopay,
  enableAutopay,
  getDefaultPaymentMethod,
  removeSavedPaymentMethod,
  setDefaultSavedPaymentMethod,
  setPreferredPaymentMethod,
  syncAllSavedPaymentMethodsFromStripe,
  syncSavedPaymentMethodsFromStripe,
  updateCustomerPaymentPreferences,
} from "@/lib/payment-preferences";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    savedPaymentMethod: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe", () => ({
  getStripe: jest.fn(),
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    savedPaymentMethod: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      delete: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

const { getStripe } = jest.requireMock("@/lib/stripe") as {
  getStripe: jest.Mock;
};

describe("payment-preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getStripe.mockReturnValue({
      paymentMethods: {
        list: jest.fn(),
        detach: jest.fn(),
      },
      customers: {
        retrieve: jest.fn(),
      },
    });

    prisma.customer.findUnique.mockResolvedValue({ id: "c_1" });
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.savedPaymentMethod.upsert.mockResolvedValue({ id: "spm_1" });
    prisma.savedPaymentMethod.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedPaymentMethod.delete.mockResolvedValue({ id: "spm_1" });
    prisma.savedPaymentMethod.updateMany.mockResolvedValue({ count: 1 });
    prisma.savedPaymentMethod.update.mockResolvedValue({ id: "spm_1", isDefault: true });
    prisma.savedPaymentMethod.findFirst.mockResolvedValue(null);
    prisma.savedPaymentMethod.findMany.mockResolvedValue([]);
  });

  it("calculates fixed 3% ACH discount", () => {
    expect(calculateAchDiscount(1000)).toEqual({
      originalAmount: 1000,
      discountedAmount: 970,
      savingsAmount: 30,
      savings_percentage: 3,
    });
  });

  it("updates preferred payment method", async () => {
    await setPreferredPaymentMethod("c_1", PaymentPreferenceMethod.ach);

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "c_1" },
      data: {
        preferredPaymentMethod: PaymentPreferenceMethod.ach,
      },
    });
  });

  it("enables and disables autopay", async () => {
    await enableAutopay("c_1", PaymentPreferenceMethod.card);
    await disableAutopay("c_1");

    expect(prisma.customer.update).toHaveBeenNthCalledWith(1, {
      where: { id: "c_1" },
      data: {
        autopayEnabled: true,
        autopayMethodType: PaymentPreferenceMethod.card,
      },
    });

    expect(prisma.customer.update).toHaveBeenNthCalledWith(2, {
      where: { id: "c_1" },
      data: {
        autopayEnabled: false,
        autopayMethodType: PaymentPreferenceMethod.none,
      },
    });
  });

  it("returns default payment method when explicitly set", async () => {
    prisma.savedPaymentMethod.findFirst
      .mockResolvedValueOnce({ id: "spm_default" })
      .mockResolvedValueOnce(null);

    const result = await getDefaultPaymentMethod("c_1");

    expect(result).toEqual({ id: "spm_default" });
    expect(prisma.savedPaymentMethod.findFirst).toHaveBeenCalledTimes(1);
  });

  it("falls back to newest payment method when no explicit default exists", async () => {
    prisma.savedPaymentMethod.findFirst.mockReset();
    prisma.savedPaymentMethod.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "spm_newest" });

    const result = await getDefaultPaymentMethod("c_1");

    expect(result).toEqual({ id: "spm_newest" });
    expect(prisma.savedPaymentMethod.findFirst).toHaveBeenCalledTimes(2);
  });

  it("syncs local saved payment methods from Stripe customer data", async () => {
    const stripe = getStripe();

    stripe.paymentMethods.list
      .mockResolvedValueOnce({
        data: [
          {
            id: "pm_card_1",
            type: "card",
            card: { brand: "visa", last4: "4242" },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "pm_bank_1",
            type: "us_bank_account",
            us_bank_account: { last4: "6789" },
          },
        ],
      });

    stripe.customers.retrieve.mockResolvedValue({
      id: "cus_1",
      invoice_settings: {
        default_payment_method: "pm_bank_1",
      },
    });

    await syncSavedPaymentMethodsFromStripe("cus_1");

    expect(prisma.savedPaymentMethod.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripePaymentMethodId: "pm_card_1" },
        update: expect.objectContaining({
          type: PaymentMethod.card,
          brand: "visa",
          last4: "4242",
        }),
      }),
    );

    expect(prisma.savedPaymentMethod.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripePaymentMethodId: "pm_bank_1" },
        update: expect.objectContaining({
          type: PaymentMethod.ach,
          brand: "bank_account",
          last4: "6789",
        }),
      }),
    );

    expect(prisma.savedPaymentMethod.updateMany).toHaveBeenCalledWith({
      where: {
        customerId: "c_1",
        stripePaymentMethodId: "pm_bank_1",
      },
      data: {
        isDefault: true,
      },
    });
  });

  it("updates customer payment preferences and returns selected fields", async () => {
    prisma.customer.update.mockResolvedValue({
      preferredPaymentMethod: PaymentPreferenceMethod.ach,
      autopayEnabled: true,
      autopayMethodType: PaymentPreferenceMethod.ach,
      achDiscountEligible: true,
    });

    await updateCustomerPaymentPreferences("c_1", {
      preferredMethod: PaymentPreferenceMethod.ach,
      autopayEnabled: true,
      autopayMethodType: PaymentPreferenceMethod.ach,
    });

    expect(prisma.customer.update).toHaveBeenLastCalledWith({
      where: { id: "c_1" },
      data: {
        preferredPaymentMethod: PaymentPreferenceMethod.ach,
        autopayEnabled: true,
        autopayMethodType: PaymentPreferenceMethod.ach,
      },
      select: {
        preferredPaymentMethod: true,
        autopayEnabled: true,
        autopayMethodType: true,
        achDiscountEligible: true,
      },
    });
  });

  it("sets default saved payment method when method belongs to customer", async () => {
    prisma.savedPaymentMethod.findFirst.mockResolvedValueOnce({ id: "spm_1", customerId: "c_1" });

    const result = await setDefaultSavedPaymentMethod("c_1", "spm_1");

    expect(result).toBe(true);
    expect(prisma.savedPaymentMethod.updateMany).toHaveBeenCalledWith({
      where: { customerId: "c_1" },
      data: { isDefault: false },
    });
    expect(prisma.savedPaymentMethod.update).toHaveBeenCalledWith({
      where: { id: "spm_1" },
      data: { isDefault: true },
    });
  });

  it("removes saved method, detaches in Stripe, and promotes fallback default", async () => {
    const stripe = getStripe();

    prisma.savedPaymentMethod.findFirst
      .mockResolvedValueOnce({
        id: "spm_delete",
        customerId: "c_1",
        stripePaymentMethodId: "pm_1",
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "spm_fallback" });

    const result = await removeSavedPaymentMethod("c_1", "spm_delete");

    expect(result).toBe(true);
    expect(prisma.savedPaymentMethod.delete).toHaveBeenCalledWith({
      where: { id: "spm_delete" },
    });
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith("pm_1");
    expect(prisma.savedPaymentMethod.update).toHaveBeenCalledWith({
      where: { id: "spm_fallback" },
      data: { isDefault: true },
    });
  });

  it("syncs all customers that have Stripe customer IDs", async () => {
    const stripe = getStripe();

    prisma.customer.findMany.mockResolvedValueOnce([
      { stripeCustomerId: "cus_1" },
      { stripeCustomerId: "cus_2" },
    ]);

    stripe.paymentMethods.list.mockResolvedValue({ data: [] });
    stripe.customers.retrieve.mockResolvedValue({
      id: "cus_1",
      invoice_settings: { default_payment_method: null },
    });

    prisma.customer.findUnique
      .mockResolvedValueOnce({ id: "c_1" })
      .mockResolvedValueOnce({ id: "c_2" });

    const result = await syncAllSavedPaymentMethodsFromStripe();

    expect(result).toEqual({ count: 2 });
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        stripeCustomerId: {
          not: null,
        },
      },
      select: {
        stripeCustomerId: true,
      },
    });
    expect(prisma.customer.findUnique).toHaveBeenNthCalledWith(1, {
      where: { stripeCustomerId: "cus_1" },
      select: { id: true },
    });
    expect(prisma.customer.findUnique).toHaveBeenNthCalledWith(2, {
      where: { stripeCustomerId: "cus_2" },
      select: { id: true },
    });
  });
});
