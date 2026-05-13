export type Role = "owner" | "dispatch" | "technician" | "accountant";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  activePlan: "monthly" | "quarterly" | "annual" | "none";
  lifecycle: "lead" | "active" | "past_due";
  lastServiceDate: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  preferredPaymentMethod?: "card" | "ach" | "none";
  autopayEnabled?: boolean;
  autopayMethodType?: "card" | "ach" | "none";
  achDiscountEligible?: boolean;
};

export type Technician = {
  id: string;
  name: string;
  status: "available" | "in_route" | "on_job" | "off_shift";
  utilizationPercent: number;
};

export type Job = {
  id: string;
  customerId: string;
  service: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed" | "reschedule_needed";
  technicianId: string;
  emergency: boolean;
};

export type Estimate = {
  id: string;
  customerId: string;
  service: string;
  amount: number;
  status: "sent" | "approved" | "declined";
  createdAt: string;
};

export type Invoice = {
  id: string;
  customerId: string;
  estimateId: string | null;
  amount: number;
  dueDate: string;
  status: "paid" | "open" | "past_due" | "refunded";
  billingCycle: "one_time" | "monthly" | "quarterly" | "annual";
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
  checkoutUrl?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  paymentStatusUpdatedAt?: string | null;
};

export type Payment = {
  id: string;
  invoiceId: string;
  method: "card" | "ach";
  status: "succeeded" | "failed" | "pending" | "refunded";
  amount: number;
  createdAt: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeRefundId?: string | null;
  failureCode?: string | null;
  refundedAt?: string | null;
};

export type AutomationEvent = {
  id: string;
  type:
    | "lead_alert"
    | "appointment_reminder"
    | "invoice_reminder"
    | "failed_payment_retry"
    | "review_request"
    | "seasonal_reservice"
    | "triage_high_urgency"
    | "triage_unresolved_high_risk"
    | "triage_follow_up_due";
  target: string;
  status: "queued" | "sent" | "failed";
  scheduledFor: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderPoint: number;
  lastUpdated: string;
};

export const adminUsers: Array<{ id: string; name: string; email: string; role: Role; twoFactorEnabled: boolean }> = [
  { id: "u_1", name: "Owner", email: "rdawson@extrasurepestcontrol.com", role: "owner", twoFactorEnabled: true },
  { id: "u_2", name: "Dispatch Lead", email: "dispatch@extrasurepestcontrol.com", role: "dispatch", twoFactorEnabled: false },
  { id: "u_3", name: "Tech A", email: "tech.a@extrasurepestcontrol.com", role: "technician", twoFactorEnabled: false },
  { id: "u_4", name: "Bookkeeper", email: "accounting@extrasurepestcontrol.com", role: "accountant", twoFactorEnabled: false },
];

export const customers: Customer[] = [
  {
    id: "c_1",
    name: "Megan R.",
    phone: "(315) 555-0132",
    email: "megan@example.com",
    city: "Syracuse",
    activePlan: "quarterly",
    lifecycle: "active",
    lastServiceDate: "2026-05-02",
  },
  {
    id: "c_2",
    name: "Paul T.",
    phone: "(315) 555-0141",
    email: "paul@example.com",
    city: "Liverpool",
    activePlan: "monthly",
    lifecycle: "active",
    lastServiceDate: "2026-04-24",
  },
  {
    id: "c_3",
    name: "Northside Property Group",
    phone: "(315) 555-0182",
    email: "ops@northsidepm.com",
    city: "Clay",
    activePlan: "annual",
    lifecycle: "active",
    lastServiceDate: "2026-04-18",
  },
  {
    id: "c_4",
    name: "Lena K.",
    phone: "(315) 555-0166",
    email: "lena@example.com",
    city: "Camillus",
    activePlan: "none",
    lifecycle: "lead",
    lastServiceDate: "2026-03-11",
  },
  {
    id: "c_5",
    name: "David P.",
    phone: "(315) 555-0104",
    email: "david@example.com",
    city: "DeWitt",
    activePlan: "quarterly",
    lifecycle: "past_due",
    lastServiceDate: "2026-03-22",
  },
];

export const technicians: Technician[] = [
  { id: "t_1", name: "Alex M.", status: "in_route", utilizationPercent: 84 },
  { id: "t_2", name: "Brandon S.", status: "on_job", utilizationPercent: 77 },
  { id: "t_3", name: "Chris T.", status: "available", utilizationPercent: 62 },
  { id: "t_4", name: "Nia R.", status: "off_shift", utilizationPercent: 0 },
];

export const jobs: Job[] = [
  {
    id: "j_1",
    customerId: "c_1",
    service: "Rodent Control",
    scheduledAt: "2026-05-09T09:30:00.000Z",
    status: "completed",
    technicianId: "t_1",
    emergency: false,
  },
  {
    id: "j_2",
    customerId: "c_2",
    service: "General Pest Prevention",
    scheduledAt: "2026-05-09T13:00:00.000Z",
    status: "in_progress",
    technicianId: "t_2",
    emergency: false,
  },
  {
    id: "j_3",
    customerId: "c_3",
    service: "Commercial Pest Management",
    scheduledAt: "2026-05-10T14:30:00.000Z",
    status: "scheduled",
    technicianId: "t_3",
    emergency: true,
  },
  {
    id: "j_4",
    customerId: "c_5",
    service: "Termite Treatment",
    scheduledAt: "2026-05-12T11:00:00.000Z",
    status: "scheduled",
    technicianId: "t_1",
    emergency: false,
  },
];

export const estimates: Estimate[] = [
  { id: "e_1", customerId: "c_4", service: "Bed Bug Treatment", amount: 479, status: "sent", createdAt: "2026-05-07" },
  { id: "e_2", customerId: "c_5", service: "Termite Treatment", amount: 920, status: "approved", createdAt: "2026-05-06" },
  { id: "e_3", customerId: "c_2", service: "Mosquito and Tick Treatments", amount: 220, status: "declined", createdAt: "2026-05-05" },
];

export const invoices: Invoice[] = [
  { id: "inv_1", customerId: "c_1", estimateId: "e_2", amount: 920, dueDate: "2026-05-15", status: "open", billingCycle: "one_time" },
  { id: "inv_2", customerId: "c_2", estimateId: null, amount: 109, dueDate: "2026-05-08", status: "paid", billingCycle: "monthly" },
  { id: "inv_3", customerId: "c_3", estimateId: null, amount: 780, dueDate: "2026-05-06", status: "past_due", billingCycle: "quarterly" },
  { id: "inv_4", customerId: "c_5", estimateId: null, amount: 249, dueDate: "2026-05-10", status: "open", billingCycle: "annual" },
];

export const payments: Payment[] = [
  { id: "pay_1", invoiceId: "inv_2", method: "card", status: "succeeded", amount: 109, createdAt: "2026-05-04T17:33:00.000Z" },
  { id: "pay_2", invoiceId: "inv_3", method: "ach", status: "failed", amount: 780, createdAt: "2026-05-07T11:14:00.000Z" },
  { id: "pay_3", invoiceId: "inv_4", method: "card", status: "pending", amount: 249, createdAt: "2026-05-09T08:20:00.000Z" },
];

export const automationEvents: AutomationEvent[] = [
  {
    id: "a_1",
    type: "lead_alert",
    target: "owner+dispatch",
    status: "sent",
    scheduledFor: "2026-05-09T09:00:00.000Z",
  },
  {
    id: "a_2",
    type: "appointment_reminder",
    target: "c_3",
    status: "queued",
    scheduledFor: "2026-05-09T18:00:00.000Z",
  },
  {
    id: "a_3",
    type: "failed_payment_retry",
    target: "inv_3",
    status: "failed",
    scheduledFor: "2026-05-08T12:30:00.000Z",
  },
  {
    id: "a_4",
    type: "review_request",
    target: "c_1",
    status: "sent",
    scheduledFor: "2026-05-09T15:30:00.000Z",
  },
];

export const inventory: InventoryItem[] = [
  { id: "m_1", name: "Exterior Barrier Concentrate", unit: "gallons", quantity: 14, reorderPoint: 8, lastUpdated: "2026-05-08" },
  { id: "m_2", name: "Rodent Bait Stations", unit: "units", quantity: 54, reorderPoint: 30, lastUpdated: "2026-05-09" },
  { id: "m_3", name: "Termite Monitoring Stakes", unit: "kits", quantity: 6, reorderPoint: 10, lastUpdated: "2026-05-06" },
  { id: "m_4", name: "Mosquito Backpack Mix", unit: "liters", quantity: 21, reorderPoint: 12, lastUpdated: "2026-05-09" },
];

export type DashboardKpi = {
  label: string;
  value: string;
  trend: string;
  tone: "positive" | "neutral" | "attention";
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getDayRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isWithinRange(value: string, start: Date, end: Date) {
  const parsed = new Date(value);
  return parsed >= start && parsed <= end;
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getCustomerById(customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

export function getTechnicianById(technicianId: string) {
  return technicians.find((tech) => tech.id === technicianId);
}

export function getInvoiceById(invoiceId: string) {
  return invoices.find((invoice) => invoice.id === invoiceId);
}

export function getOverviewKpis(): DashboardKpi[] {
  const todayRange = getDayRange();
  const yesterdayReference = new Date(todayRange.start);
  yesterdayReference.setDate(yesterdayReference.getDate() - 1);
  const yesterdayRange = getDayRange(yesterdayReference);

  const sevenDaysOut = new Date(todayRange.end);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const revenueCollectedToday = payments
    .filter((payment) => payment.status === "succeeded" && isWithinRange(payment.createdAt, todayRange.start, todayRange.end))
    .reduce((total, payment) => total + payment.amount, 0);
  const revenueCollectedYesterday = payments
    .filter((payment) => payment.status === "succeeded" && isWithinRange(payment.createdAt, yesterdayRange.start, yesterdayRange.end))
    .reduce((total, payment) => total + payment.amount, 0);
  const outstandingInvoices = invoices
    .filter((invoice) => invoice.status === "open" || invoice.status === "past_due")
    .reduce((total, invoice) => total + invoice.amount, 0);
  const pastDueAccounts = invoices.filter((invoice) => invoice.status === "past_due").length;
  const newLeadsToday = automationEvents.filter(
    (event) => event.type === "lead_alert" && isWithinRange(event.scheduledFor, todayRange.start, todayRange.end),
  ).length;
  const openLeads = customers.filter((customer) => customer.lifecycle === "lead").length;
  const jobsCompletedToday = jobs.filter(
    (job) => job.status === "completed" && isWithinRange(job.scheduledAt, todayRange.start, todayRange.end),
  ).length;
  const emergencyClosuresToday = jobs.filter(
    (job) => job.status === "completed" && job.emergency && isWithinRange(job.scheduledAt, todayRange.start, todayRange.end),
  ).length;
  const jobsScheduledNext7Days = jobs.filter(
    (job) =>
      (job.status === "scheduled" || job.status === "in_progress") &&
      isWithinRange(job.scheduledAt, todayRange.start, sevenDaysOut),
  ).length;
  const availableTechnicians = technicians.filter((tech) => tech.status !== "off_shift").length;
  const weeklyCapacity = Math.max(1, availableTechnicians * 35);
  const capacityPercent = Math.min(100, Math.round((jobsScheduledNext7Days / weeklyCapacity) * 100));
  const failedPayments = payments.filter((payment) => payment.status === "failed").length;
  const avgTicketSize = invoices.length
    ? Math.round(invoices.reduce((total, invoice) => total + invoice.amount, 0) / invoices.length)
    : 0;
  const recurringCount = customers.filter((customer) => customer.activePlan !== "none").length;
  const recurringRetention = customers.length ? Math.round((recurringCount / customers.length) * 100) : 0;
  const revenueTrend =
    revenueCollectedYesterday > 0
      ? `${Math.round(((revenueCollectedToday - revenueCollectedYesterday) / revenueCollectedYesterday) * 100)}% vs yesterday`
      : revenueCollectedToday > 0
        ? "new collections vs yesterday"
        : "no collections yet";

  return [
    {
      label: "Revenue Collected Today",
      value: currency(revenueCollectedToday),
      trend: revenueTrend,
      tone: revenueCollectedToday >= revenueCollectedYesterday ? "positive" : "attention",
    },
    {
      label: "Outstanding Invoices",
      value: currency(outstandingInvoices),
      trend: `${pluralize(pastDueAccounts, "account", "accounts")} past due`,
      tone: pastDueAccounts > 0 ? "attention" : "neutral",
    },
    {
      label: "New Leads Today",
      value: String(newLeadsToday),
      trend: `${pluralize(openLeads, "lead", "leads")} awaiting follow-up`,
      tone: newLeadsToday > 0 ? "positive" : "neutral",
    },
    {
      label: "Jobs Completed Today",
      value: String(jobsCompletedToday),
      trend:
        emergencyClosuresToday > 0
          ? `${pluralize(emergencyClosuresToday, "emergency closure", "emergency closures")}`
          : "no emergency closures",
      tone: "neutral",
    },
    {
      label: "Jobs Scheduled Next 7 Days",
      value: String(jobsScheduledNext7Days),
      trend: `capacity at ${capacityPercent}%`,
      tone: "neutral",
    },
    {
      label: "Average Ticket Size",
      value: currency(avgTicketSize),
      trend: `${pluralize(invoices.length, "invoice", "invoices")}`,
      tone: "positive",
    },
    {
      label: "Recurring Plan Retention",
      value: `${recurringRetention}%`,
      trend: `${recurringCount} of ${customers.length} customers enrolled`,
      tone: "positive",
    },
    {
      label: "Failed Payments",
      value: String(failedPayments),
      trend: failedPayments > 0 ? `${pluralize(failedPayments, "retry", "retries")} needed` : "no retries needed",
      tone: failedPayments > 0 ? "attention" : "positive",
    },
  ];
}
