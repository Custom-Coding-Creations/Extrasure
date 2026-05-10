import {
  type Customer,
  adminUsers,
  automationEvents,
  customers,
  estimates,
  getOverviewKpis,
  inventory,
  invoices,
  jobs,
  payments,
  technicians,
} from "@/lib/admin-data";
import { prisma } from "@/lib/prisma";

export class AdminDataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminDataUnavailableError";
  }
}

function allowAdminMockData() {
  return process.env.NODE_ENV !== "production";
}

/** Fallback state using static seed data for local development only. */
function getStaticAdminState(): AdminState {
  return {
    adminUsers,
    customers,
    technicians,
    jobs,
    estimates,
    invoices,
    payments,
    automationEvents,
    inventory,
  };
}

type DashboardKpi = ReturnType<typeof getOverviewKpis>[number];

export type AdminState = {
  adminUsers: typeof adminUsers;
  customers: typeof customers;
  technicians: typeof technicians;
  jobs: typeof jobs;
  estimates: typeof estimates;
  invoices: typeof invoices;
  payments: typeof payments;
  automationEvents: typeof automationEvents;
  inventory: typeof inventory;
};

function toIso(date: Date) {
  return date.toISOString();
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toCustomerRecord(customer: Customer) {
  return {
    ...customer,
    lastServiceDate: new Date(customer.lastServiceDate),
  };
}

async function ensureSeededState() {
  const hasData = await prisma.adminUser.count();

  if (hasData > 0) {
    return;
  }

  if (!allowAdminMockData()) {
    throw new AdminDataUnavailableError(
      "Admin data store is empty in production. Run the database setup and load live operational data before using the dashboard.",
    );
  }

  await prisma.$transaction([
    prisma.adminUser.createMany({ data: adminUsers }),
    prisma.customer.createMany({
      data: customers.map((customer) => ({
        ...customer,
        lastServiceDate: new Date(customer.lastServiceDate),
      })),
    }),
    prisma.technician.createMany({ data: technicians }),
    prisma.job.createMany({
      data: jobs.map((job) => ({
        ...job,
        scheduledAt: new Date(job.scheduledAt),
      })),
    }),
    prisma.estimate.createMany({
      data: estimates.map((estimate) => ({
        ...estimate,
        createdAt: new Date(estimate.createdAt),
      })),
    }),
    prisma.invoice.createMany({
      data: invoices.map((invoice) => ({
        ...invoice,
        dueDate: new Date(invoice.dueDate),
      })),
    }),
    prisma.payment.createMany({
      data: payments.map((payment) => ({
        ...payment,
        createdAt: new Date(payment.createdAt),
      })),
    }),
    prisma.automationEvent.createMany({
      data: automationEvents.map((event) => ({
        ...event,
        scheduledFor: new Date(event.scheduledFor),
      })),
    }),
    prisma.inventoryItem.createMany({
      data: inventory.map((item) => ({
        ...item,
        lastUpdated: new Date(item.lastUpdated),
      })),
    }),
  ]);
}

export async function getAdminState(): Promise<AdminState> {
  try {
    await ensureSeededState();
  } catch (error) {
    if (allowAdminMockData()) {
      return getStaticAdminState();
    }

    if (error instanceof AdminDataUnavailableError) {
      throw error;
    }

    throw new AdminDataUnavailableError(
      "Admin data is unavailable in production. Verify database connectivity and seed the required records.",
    );
  }

  try {
    const [
      dbAdminUsers,
      dbCustomers,
      dbTechnicians,
      dbJobs,
      dbEstimates,
      dbInvoices,
      dbPayments,
      dbAutomationEvents,
      dbInventory,
    ] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { id: "asc" } }),
      prisma.customer.findMany({ orderBy: { id: "asc" } }),
      prisma.technician.findMany({ orderBy: { id: "asc" } }),
      prisma.job.findMany({ orderBy: { scheduledAt: "asc" } }),
      prisma.estimate.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.invoice.findMany({ orderBy: { dueDate: "asc" } }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.automationEvent.findMany({ orderBy: { scheduledFor: "desc" } }),
      prisma.inventoryItem.findMany({ orderBy: { id: "asc" } }),
    ]);

    return {
      adminUsers: dbAdminUsers,
      customers: dbCustomers.map((customer) => ({
        ...customer,
        lastServiceDate: toDateOnly(customer.lastServiceDate),
      })),
      technicians: dbTechnicians,
      jobs: dbJobs.map((job) => ({
        ...job,
        scheduledAt: toIso(job.scheduledAt),
      })),
      estimates: dbEstimates.map((estimate) => ({
        ...estimate,
        createdAt: toDateOnly(estimate.createdAt),
      })),
      invoices: dbInvoices.map((invoice) => ({
        ...invoice,
        dueDate: toDateOnly(invoice.dueDate),
        paidAt: invoice.paidAt ? toIso(invoice.paidAt) : null,
        refundedAt: invoice.refundedAt ? toIso(invoice.refundedAt) : null,
        paymentStatusUpdatedAt: invoice.paymentStatusUpdatedAt ? toIso(invoice.paymentStatusUpdatedAt) : null,
      })),
      payments: dbPayments.map((payment) => ({
        ...payment,
        createdAt: toIso(payment.createdAt),
        refundedAt: payment.refundedAt ? toIso(payment.refundedAt) : null,
      })),
      automationEvents: dbAutomationEvents.map((event) => ({
        ...event,
        scheduledFor: toIso(event.scheduledFor),
      })),
      inventory: dbInventory.map((item) => ({
        ...item,
        lastUpdated: toDateOnly(item.lastUpdated),
      })),
    } satisfies AdminState;
  } catch {
    if (allowAdminMockData()) {
      return getStaticAdminState();
    }

    throw new AdminDataUnavailableError(
      "Failed to load admin dashboard data from the production database.",
    );
  }
}

export async function saveAdminState(state: AdminState) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.invoice.deleteMany();
    await tx.estimate.deleteMany();
    await tx.job.deleteMany();
    await tx.automationEvent.deleteMany();
    await tx.inventoryItem.deleteMany();
    await tx.technician.deleteMany();
    await tx.customer.deleteMany();
    await tx.adminUser.deleteMany();

    await tx.adminUser.createMany({ data: state.adminUsers });
    await tx.customer.createMany({
      data: state.customers.map((customer) => ({
        ...customer,
        lastServiceDate: new Date(customer.lastServiceDate),
      })),
    });
    await tx.technician.createMany({ data: state.technicians });
    await tx.job.createMany({
      data: state.jobs.map((job) => ({
        ...job,
        scheduledAt: new Date(job.scheduledAt),
      })),
    });
    await tx.estimate.createMany({
      data: state.estimates.map((estimate) => ({
        ...estimate,
        createdAt: new Date(estimate.createdAt),
      })),
    });
    await tx.invoice.createMany({
      data: state.invoices.map((invoice) => ({
        ...invoice,
        dueDate: new Date(invoice.dueDate),
      })),
    });
    await tx.payment.createMany({
      data: state.payments.map((payment) => ({
        ...payment,
        createdAt: new Date(payment.createdAt),
      })),
    });
    await tx.automationEvent.createMany({
      data: state.automationEvents.map((event) => ({
        ...event,
        scheduledFor: new Date(event.scheduledFor),
      })),
    });
    await tx.inventoryItem.createMany({
      data: state.inventory.map((item) => ({
        ...item,
        lastUpdated: new Date(item.lastUpdated),
      })),
    });
  });
}

type CustomerMutationInput = Omit<Customer, "id">;

function validateCustomerInput(input: CustomerMutationInput) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const city = input.city.trim();
  const lastServiceDate = input.lastServiceDate.trim();

  if (!name || !phone || !email || !city || !lastServiceDate) {
    throw new Error("Customer name, phone, email, city, and last service date are required.");
  }

  const parsedLastServiceDate = new Date(lastServiceDate);

  if (Number.isNaN(parsedLastServiceDate.getTime())) {
    throw new Error("Customer last service date is invalid.");
  }

  return {
    name,
    phone,
    email,
    city,
    activePlan: input.activePlan,
    lifecycle: input.lifecycle,
    lastServiceDate,
  } satisfies CustomerMutationInput;
}

export async function createCustomer(input: CustomerMutationInput) {
  await ensureSeededState();
  const customer = validateCustomerInput(input);
  const id = `c_${Date.now()}`;

  return prisma.customer.create({
    data: toCustomerRecord({
      id,
      ...customer,
    }),
  });
}

export async function updateCustomer(id: string, input: CustomerMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Customer id is required.");
  }

  const customer = validateCustomerInput(input);

  return prisma.customer.update({
    where: { id },
    data: toCustomerRecord({
      id,
      ...customer,
    }),
  });
}

export async function deleteCustomer(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Customer id is required.");
  }

  const [jobCount, estimateCount, invoiceCount] = await Promise.all([
    prisma.job.count({ where: { customerId: id } }),
    prisma.estimate.count({ where: { customerId: id } }),
    prisma.invoice.count({ where: { customerId: id } }),
  ]);

  if (jobCount > 0 || estimateCount > 0 || invoiceCount > 0) {
    throw new Error("Customer cannot be deleted while jobs, estimates, or invoices still reference the record.");
  }

  return prisma.customer.delete({ where: { id } });
}

export async function queuePaymentRetry(invoiceId: string) {
  await ensureSeededState();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return {
      ok: false,
      error: "Invoice not found",
    } as const;
  }

  const retryEventId = `a_retry_${Date.now()}`;
  const retryPaymentId = `pay_retry_${Date.now()}`;

  await prisma.$transaction([
    prisma.automationEvent.create({
      data: {
        id: retryEventId,
        type: "failed_payment_retry",
        target: invoiceId,
        status: "queued",
        scheduledFor: new Date(Date.now() + 1000 * 60 * 5),
      },
    }),
    prisma.payment.create({
      data: {
        id: retryPaymentId,
        invoiceId,
        method: "card",
        status: "pending",
        amount: invoice.amount,
        createdAt: new Date(),
      },
    }),
  ]);

  return {
    ok: true,
    invoice: {
      ...invoice,
      dueDate: toDateOnly(invoice.dueDate),
    },
    retryEventId,
    retryPaymentId,
  } as const;
}

function toCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getOverviewKpisFromState(state: AdminState): DashboardKpi[] {
  const revenueCollectedToday = state.payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((total, payment) => total + payment.amount, 0);
  const outstandingInvoices = state.invoices
    .filter((invoice) => invoice.status === "open" || invoice.status === "past_due")
    .reduce((total, invoice) => total + invoice.amount, 0);
  const jobsCompletedToday = state.jobs.filter((job) => job.status === "completed").length;
  const jobsScheduledNext7Days = state.jobs.filter(
    (job) => job.status === "scheduled" || job.status === "in_progress",
  ).length;
  const failedPayments = state.payments.filter((payment) => payment.status === "failed").length;
  const avgTicketSize = state.invoices.length
    ? Math.round(
        state.invoices.reduce((total, invoice) => total + invoice.amount, 0) / state.invoices.length,
      )
    : 0;
  const recurringCount = state.customers.filter((customer) => customer.activePlan !== "none").length;
  const recurringRetention = state.customers.length
    ? Math.round((recurringCount / state.customers.length) * 100)
    : 0;

  return [
    {
      label: "Revenue Collected Today",
      value: toCurrency(revenueCollectedToday),
      trend: "+12% vs yesterday",
      tone: "positive",
    },
    {
      label: "Outstanding Invoices",
      value: toCurrency(outstandingInvoices),
      trend: "3 accounts past due",
      tone: "attention",
    },
    {
      label: "New Leads Today",
      value: "11",
      trend: "4 from Google profile",
      tone: "positive",
    },
    {
      label: "Jobs Completed Today",
      value: String(jobsCompletedToday),
      trend: "1 emergency closure",
      tone: "neutral",
    },
    {
      label: "Jobs Scheduled Next 7 Days",
      value: String(jobsScheduledNext7Days),
      trend: "capacity at 82%",
      tone: "neutral",
    },
    {
      label: "Average Ticket Size",
      value: toCurrency(avgTicketSize),
      trend: "+6% MoM",
      tone: "positive",
    },
    {
      label: "Recurring Plan Retention",
      value: `${recurringRetention}%`,
      trend: "steady",
      tone: "positive",
    },
    {
      label: "Failed Payments",
      value: String(failedPayments),
      trend: "1 retry needed",
      tone: "attention",
    },
  ];
}
