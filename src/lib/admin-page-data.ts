import { AdminDataUnavailableError, type AdminState, getAdminState } from "@/lib/admin-store";

export type AdminPageDataResult =
  | {
      state: AdminState;
      dataError: null;
    }
  | {
      state: null;
      dataError: string;
    };

export async function loadAdminPageData(): Promise<AdminPageDataResult> {
  try {
    return {
      state: await getAdminState(),
      dataError: null,
    };
  } catch (error) {
    if (error instanceof AdminDataUnavailableError) {
      return {
        state: null,
        dataError: error.message,
      };
    }

    throw error;
  }
}

export type AchAdoptionMetrics = {
  totalCustomers: number;
  achEnabledCustomers: number;
  autopayCustomers: number;
  achDiscountUsageCount: number;
  achMethodShareByBillingCycle: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
};

export type PaymentMethodDistribution = {
  card: {
    count: number;
    percentage: number;
  };
  ach: {
    count: number;
    percentage: number;
  };
};

function percent(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }

  return Number(((part / whole) * 100).toFixed(1));
}

export async function getAchAdoptionMetrics(initialState?: AdminState | null): Promise<AchAdoptionMetrics> {
  const state = initialState ?? (await loadAdminPageData()).state;

  if (!state) {
    return {
      totalCustomers: 0,
      achEnabledCustomers: 0,
      autopayCustomers: 0,
      achDiscountUsageCount: 0,
      achMethodShareByBillingCycle: {
        monthly: 0,
        quarterly: 0,
        annual: 0,
      },
    };
  }

  const totalCustomers = state.customers.length;
  const achEnabledCustomers = state.customers.filter((customer) => customer.preferredPaymentMethod === "ach").length;
  const autopayCustomers = state.customers.filter((customer) => customer.autopayEnabled).length;

  const achSucceededPayments = state.payments.filter(
    (payment) => payment.method === "ach" && payment.status === "succeeded",
  );

  const invoiceById = new Map(state.invoices.map((invoice) => [invoice.id, invoice]));
  const cycleKeys = ["monthly", "quarterly", "annual"] as const;
  const cycleTotals = {
    monthly: 0,
    quarterly: 0,
    annual: 0,
  };
  const cycleAch = {
    monthly: 0,
    quarterly: 0,
    annual: 0,
  };

  for (const invoice of state.invoices) {
    if (invoice.billingCycle === "monthly" || invoice.billingCycle === "quarterly" || invoice.billingCycle === "annual") {
      cycleTotals[invoice.billingCycle] += 1;
    }
  }

  for (const payment of achSucceededPayments) {
    const invoice = invoiceById.get(payment.invoiceId);

    if (!invoice) {
      continue;
    }

    if (invoice.billingCycle === "monthly" || invoice.billingCycle === "quarterly" || invoice.billingCycle === "annual") {
      cycleAch[invoice.billingCycle] += 1;
    }
  }

  const achMethodShareByBillingCycle = {
    monthly: percent(cycleAch.monthly, cycleTotals.monthly),
    quarterly: percent(cycleAch.quarterly, cycleTotals.quarterly),
    annual: percent(cycleAch.annual, cycleTotals.annual),
  };

  return {
    totalCustomers,
    achEnabledCustomers,
    autopayCustomers,
    achDiscountUsageCount: achSucceededPayments.length,
    achMethodShareByBillingCycle,
  };
}

export async function getPaymentMethodDistribution(initialState?: AdminState | null): Promise<PaymentMethodDistribution> {
  const state = initialState ?? (await loadAdminPageData()).state;

  if (!state) {
    return {
      card: { count: 0, percentage: 0 },
      ach: { count: 0, percentage: 0 },
    };
  }

  const count = {
    card: state.payments.filter((payment) => payment.method === "card").length,
    ach: state.payments.filter((payment) => payment.method === "ach").length,
  };

  const total = count.card + count.ach;

  return {
    card: {
      count: count.card,
      percentage: percent(count.card, total),
    },
    ach: {
      count: count.ach,
      percentage: percent(count.ach, total),
    },
  };
}