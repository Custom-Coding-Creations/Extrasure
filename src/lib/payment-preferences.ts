import "server-only";

import { randomUUID } from "node:crypto";
import { PaymentPreferenceMethod, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type { AchDiscountSummary } from "@/types/payment-preferences";

function mapPaymentMethodType(method: { type: string }) {
  return method.type === "us_bank_account" ? PaymentMethod.ach : PaymentMethod.card;
}

function mapPaymentMethodBrand(method: {
  type: string;
  card?: { brand?: string | null } | null;
}) {
  if (method.type === "us_bank_account") {
    return "bank_account";
  }

  const brand = method.card?.brand?.toLowerCase() ?? "generic";

  if (brand === "visa" || brand === "amex" || brand === "discover") {
    return brand;
  }

  return "generic";
}

function mapPaymentMethodLast4(method: {
  type: string;
  card?: { last4?: string | null } | null;
  us_bank_account?: { last4?: string | null } | null;
}) {
  if (method.type === "us_bank_account") {
    return method.us_bank_account?.last4 ?? "0000";
  }

  return method.card?.last4 ?? "0000";
}

function toPaymentPreferenceMethod(value: PaymentPreferenceMethod) {
  return value;
}

export async function syncSavedPaymentMethodsFromStripe(stripeCustomerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (!customer) {
    return;
  }

  const stripe = getStripe();
  const [cards, banks, stripeCustomer] = await Promise.all([
    stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 100,
    }),
    stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "us_bank_account",
      limit: 100,
    }),
    stripe.customers.retrieve(stripeCustomerId),
  ]);

  const methods = [...cards.data, ...banks.data];
  const activeMethodIds = methods.map((method) => method.id);

  let defaultPaymentMethodId: string | null = null;

  if (!("deleted" in stripeCustomer)) {
    const defaultPaymentMethod = stripeCustomer.invoice_settings?.default_payment_method;

    if (typeof defaultPaymentMethod === "string") {
      defaultPaymentMethodId = defaultPaymentMethod;
    } else if (defaultPaymentMethod?.id) {
      defaultPaymentMethodId = defaultPaymentMethod.id;
    }
  }

  if (!methods.length) {
    await prisma.savedPaymentMethod.deleteMany({
      where: { customerId: customer.id },
    });
    return;
  }

  for (const method of methods) {
    await prisma.savedPaymentMethod.upsert({
      where: {
        stripePaymentMethodId: method.id,
      },
      update: {
        customerId: customer.id,
        type: mapPaymentMethodType(method),
        brand: mapPaymentMethodBrand(method),
        last4: mapPaymentMethodLast4(method),
      },
      create: {
        id: `spm_${randomUUID()}`,
        customerId: customer.id,
        stripePaymentMethodId: method.id,
        type: mapPaymentMethodType(method),
        brand: mapPaymentMethodBrand(method),
        last4: mapPaymentMethodLast4(method),
        isDefault: false,
      },
    });
  }

  await prisma.savedPaymentMethod.deleteMany({
    where: {
      customerId: customer.id,
      stripePaymentMethodId: {
        notIn: activeMethodIds,
      },
    },
  });

  await prisma.savedPaymentMethod.updateMany({
    where: {
      customerId: customer.id,
    },
    data: {
      isDefault: false,
    },
  });

  if (defaultPaymentMethodId) {
    await prisma.savedPaymentMethod.updateMany({
      where: {
        customerId: customer.id,
        stripePaymentMethodId: defaultPaymentMethodId,
      },
      data: {
        isDefault: true,
      },
    });
  }
}

export async function setPreferredPaymentMethod(customerId: string, type: PaymentPreferenceMethod) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      preferredPaymentMethod: toPaymentPreferenceMethod(type),
    },
  });
}

export async function enableAutopay(customerId: string, methodType: Exclude<PaymentPreferenceMethod, "none">) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      autopayEnabled: true,
      autopayMethodType: methodType,
    },
  });
}

export async function disableAutopay(customerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      autopayEnabled: false,
      autopayMethodType: PaymentPreferenceMethod.none,
    },
  });
}

type UpdatePaymentPreferencesInput = {
  preferredMethod?: PaymentPreferenceMethod;
  autopayEnabled?: boolean;
  autopayMethodType?: PaymentPreferenceMethod;
};

export async function updateCustomerPaymentPreferences(customerId: string, input: UpdatePaymentPreferencesInput) {
  const data: {
    preferredPaymentMethod?: PaymentPreferenceMethod;
    autopayEnabled?: boolean;
    autopayMethodType?: PaymentPreferenceMethod;
  } = {};

  if (input.preferredMethod) {
    data.preferredPaymentMethod = input.preferredMethod;
  }

  if (typeof input.autopayEnabled === "boolean") {
    data.autopayEnabled = input.autopayEnabled;

    if (!input.autopayEnabled) {
      data.autopayMethodType = PaymentPreferenceMethod.none;
    }
  }

  if (input.autopayMethodType) {
    data.autopayMethodType = input.autopayMethodType;
  }

  return prisma.customer.update({
    where: { id: customerId },
    data,
    select: {
      preferredPaymentMethod: true,
      autopayEnabled: true,
      autopayMethodType: true,
      achDiscountEligible: true,
    },
  });
}

export async function getCustomerPaymentMethods(customerId: string) {
  return prisma.savedPaymentMethod.findMany({
    where: { customerId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getDefaultPaymentMethod(customerId: string) {
  const explicitDefault = await prisma.savedPaymentMethod.findFirst({
    where: {
      customerId,
      isDefault: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (explicitDefault) {
    return explicitDefault;
  }

  return prisma.savedPaymentMethod.findFirst({
    where: {
      customerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function setDefaultSavedPaymentMethod(customerId: string, savedPaymentMethodId: string) {
  const target = await prisma.savedPaymentMethod.findFirst({
    where: {
      id: savedPaymentMethodId,
      customerId,
    },
  });

  if (!target) {
    return false;
  }

  await prisma.savedPaymentMethod.updateMany({
    where: { customerId },
    data: { isDefault: false },
  });

  await prisma.savedPaymentMethod.update({
    where: { id: target.id },
    data: { isDefault: true },
  });

  return true;
}

export async function removeSavedPaymentMethod(customerId: string, savedPaymentMethodId: string) {
  const record = await prisma.savedPaymentMethod.findFirst({
    where: {
      id: savedPaymentMethodId,
      customerId,
    },
  });

  if (!record) {
    return false;
  }

  await prisma.savedPaymentMethod.delete({
    where: {
      id: record.id,
    },
  });

  const stripe = getStripe();

  try {
    await stripe.paymentMethods.detach(record.stripePaymentMethodId);
  } catch {
    // Keep local state clean even if Stripe already detached or rejects this method.
  }

  const hasDefault = await prisma.savedPaymentMethod.findFirst({
    where: {
      customerId,
      isDefault: true,
    },
  });

  if (!hasDefault) {
    const fallback = await prisma.savedPaymentMethod.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    if (fallback) {
      await prisma.savedPaymentMethod.update({
        where: { id: fallback.id },
        data: { isDefault: true },
      });
    }
  }

  return true;
}

export async function syncAllSavedPaymentMethodsFromStripe() {
  const customers = await prisma.customer.findMany({
    where: {
      stripeCustomerId: {
        not: null,
      },
    },
    select: {
      stripeCustomerId: true,
    },
  });

  for (const customer of customers) {
    if (customer.stripeCustomerId) {
      await syncSavedPaymentMethodsFromStripe(customer.stripeCustomerId);
    }
  }

  return { count: customers.length };
}

export async function isAchDiscountEligible(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { achDiscountEligible: true },
  });

  return customer?.achDiscountEligible ?? false;
}

export function calculateAchDiscount(amount: number): AchDiscountSummary {
  const originalAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const savingsAmount = Number((originalAmount * 0.03).toFixed(2));
  const discountedAmount = Number((originalAmount - savingsAmount).toFixed(2));

  return {
    originalAmount,
    discountedAmount,
    savingsAmount,
    savings_percentage: 3,
  };
}
