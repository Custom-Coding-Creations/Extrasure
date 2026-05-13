import type { AdminState } from "@/lib/admin-store";
import {
  getAchAdoptionMetrics,
  getPaymentMethodDistribution,
} from "@/lib/admin-page-data";

describe("admin-page-data ACH analytics", () => {
  function makeState(): AdminState {
    return {
      adminUsers: [],
      customers: [
        {
          id: "c_1",
          name: "A",
          phone: "1",
          email: "a@example.com",
          city: "A",
          activePlan: "monthly",
          lifecycle: "active",
          lastServiceDate: "2026-05-01",
          preferredPaymentMethod: "ach",
          autopayEnabled: true,
          autopayMethodType: "ach",
          achDiscountEligible: true,
        },
        {
          id: "c_2",
          name: "B",
          phone: "2",
          email: "b@example.com",
          city: "B",
          activePlan: "quarterly",
          lifecycle: "active",
          lastServiceDate: "2026-05-01",
          preferredPaymentMethod: "card",
          autopayEnabled: false,
          autopayMethodType: "none",
          achDiscountEligible: false,
        },
      ],
      technicians: [],
      jobs: [],
      estimates: [],
      invoices: [
        {
          id: "inv_1",
          customerId: "c_1",
          estimateId: null,
          amount: 100,
          dueDate: "2026-05-10",
          status: "paid",
          billingCycle: "monthly",
        },
        {
          id: "inv_2",
          customerId: "c_2",
          estimateId: null,
          amount: 200,
          dueDate: "2026-05-10",
          status: "paid",
          billingCycle: "quarterly",
        },
      ],
      payments: [
        {
          id: "pay_1",
          invoiceId: "inv_1",
          method: "ach",
          status: "succeeded",
          amount: 100,
          createdAt: "2026-05-10T10:00:00.000Z",
        },
        {
          id: "pay_2",
          invoiceId: "inv_2",
          method: "card",
          status: "succeeded",
          amount: 200,
          createdAt: "2026-05-10T10:00:00.000Z",
        },
      ],
      automationEvents: [],
      inventory: [],
    } as AdminState;
  }

  it("calculates ACH adoption metrics from provided admin state", async () => {
    const state = makeState();
    const metrics = await getAchAdoptionMetrics(state);

    expect(metrics).toEqual({
      totalCustomers: 2,
      achEnabledCustomers: 1,
      autopayCustomers: 1,
      achDiscountUsageCount: 1,
      achMethodShareByBillingCycle: {
        monthly: 100,
        quarterly: 0,
        annual: 0,
      },
    });
  });

  it("calculates payment method distribution percentages", async () => {
    const state = makeState();
    const distribution = await getPaymentMethodDistribution(state);

    expect(distribution).toEqual({
      card: { count: 1, percentage: 50 },
      ach: { count: 1, percentage: 50 },
    });
  });
});
