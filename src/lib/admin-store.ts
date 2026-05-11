import {
  type Customer,
  type Job,
  type Invoice,
  type Estimate,
  type InventoryItem,
  type AutomationEvent,
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

function usesFileDatabaseUrl() {
  return process.env.DATABASE_URL?.trim().startsWith("file:") ?? false;
}

function formatProductionDbError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (message.includes("relation") && message.includes("does not exist")) {
    return "Production database schema is missing tables. Ensure Vercel build runs the Postgres Prisma schema push before loading the admin dashboard.";
  }

  if (message.includes("can't reach database server") || message.includes("timed out")) {
    return "Cannot reach the production database. Verify DATABASE_URL host, network access rules, and SSL settings in Vercel.";
  }

  if (message.includes("authentication failed") || message.includes("password authentication failed")) {
    return "Production database authentication failed. Verify DATABASE_URL username/password in Vercel environment variables.";
  }

  if (message.includes("the URL must start with the protocol".toLowerCase())) {
    return "Production DATABASE_URL format is invalid. Use a postgres:// or postgresql:// connection string.";
  }

  return `${fallback} (${error.message})`;
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

function toJobRecord(job: Job) {
  return {
    ...job,
    scheduledAt: new Date(job.scheduledAt),
  };
}

function toInvoiceRecord(invoice: Invoice) {
  return {
    ...invoice,
    dueDate: new Date(invoice.dueDate),
  };
}

function toInventoryRecord(item: InventoryItem) {
  return {
    ...item,
    lastUpdated: new Date(item.lastUpdated),
  };
}

function toAutomationEventRecord(event: AutomationEvent) {
  return {
    ...event,
    scheduledFor: new Date(event.scheduledFor),
  };
}

function toEstimateRecord(estimate: Estimate) {
  return {
    ...estimate,
    createdAt: new Date(estimate.createdAt),
  };
}

async function ensureSeededState() {
  if (!allowAdminMockData() && usesFileDatabaseUrl()) {
    throw new AdminDataUnavailableError(
      "Production DATABASE_URL is using a file-based SQLite path. Configure a persistent Postgres DATABASE_URL for Vercel before loading the admin dashboard.",
    );
  }

  const hasData = await prisma.adminUser.count();

  if (hasData > 0) {
    return;
  }

  if (!allowAdminMockData()) {
    throw new AdminDataUnavailableError(
      "Admin data store is empty in production. Seed the production database (npm run db:seed:prod) before using the dashboard.",
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
    if (!allowAdminMockData()) {
      console.error("[admin-store] ensureSeededState failed", error);
    }

    if (allowAdminMockData()) {
      return getStaticAdminState();
    }

    if (error instanceof AdminDataUnavailableError) {
      throw error;
    }

    throw new AdminDataUnavailableError(
      formatProductionDbError(
        error,
        "Admin data is unavailable in production. Verify database connectivity and seed the required records.",
      ),
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
      technicians: dbTechnicians.map((technician) => ({
        ...technician,
        utilizationPercent: deriveUtilizationPercent(dbJobs, technician.id),
      })),
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
  } catch (error) {
    if (!allowAdminMockData()) {
      console.error("[admin-store] query read failed", error);
    }

    if (allowAdminMockData()) {
      return getStaticAdminState();
    }

    throw new AdminDataUnavailableError(
      formatProductionDbError(
        error,
        "Failed to load admin dashboard data from the production database.",
      ),
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

type JobMutationInput = Omit<Job, "id">;

function validateJobInput(input: JobMutationInput) {
  const customerId = input.customerId.trim();
  const service = input.service.trim();
  const scheduledAt = input.scheduledAt.trim();
  const technicianId = input.technicianId.trim();

  if (!customerId || !service || !scheduledAt || !technicianId) {
    throw new Error("Job customer, service, scheduled time, and technician are required.");
  }

  const parsedScheduledAt = new Date(scheduledAt);

  if (Number.isNaN(parsedScheduledAt.getTime())) {
    throw new Error("Job scheduled time is invalid.");
  }

  return {
    customerId,
    service,
    scheduledAt,
    status: input.status,
    technicianId,
    emergency: Boolean(input.emergency),
  } satisfies JobMutationInput;
}

async function assertJobReferencesExist(customerId: string, technicianId: string) {
  const [customer, technician] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.technician.findUnique({ where: { id: technicianId } }),
  ]);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (!technician) {
    throw new Error("Technician not found.");
  }
}

export async function createJob(input: JobMutationInput) {
  await ensureSeededState();
  const job = validateJobInput(input);
  await assertJobReferencesExist(job.customerId, job.technicianId);

  return prisma.job.create({
    data: toJobRecord({
      id: `j_${Date.now()}`,
      ...job,
    }),
  });
}

export async function updateJob(id: string, input: JobMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Job id is required.");
  }

  const job = validateJobInput(input);
  await assertJobReferencesExist(job.customerId, job.technicianId);

  return prisma.job.update({
    where: { id },
    data: toJobRecord({
      id,
      ...job,
    }),
  });
}

export async function deleteJob(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Job id is required.");
  }

  return prisma.job.delete({ where: { id } });
}

type InvoiceMutationInput = Omit<Invoice, "id">;

function validateInvoiceInput(input: InvoiceMutationInput) {
  const customerId = input.customerId.trim();
  const estimateId = input.estimateId?.trim() ?? null;
  const dueDate = input.dueDate.trim();
  const amount = Number(input.amount);

  if (!customerId || !dueDate || !Number.isFinite(amount) || amount < 0) {
    throw new Error("Invoice customer, amount, and due date are required.");
  }

  const parsedDueDate = new Date(dueDate);

  if (Number.isNaN(parsedDueDate.getTime())) {
    throw new Error("Invoice due date is invalid.");
  }

  return {
    customerId,
    estimateId,
    amount: Math.round(amount),
    dueDate,
    status: input.status,
    billingCycle: input.billingCycle,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    stripeInvoiceId: input.stripeInvoiceId ?? null,
    checkoutUrl: input.checkoutUrl ?? null,
    paidAt: input.paidAt ?? null,
    refundedAt: input.refundedAt ?? null,
    paymentStatusUpdatedAt: input.paymentStatusUpdatedAt ?? null,
  } satisfies InvoiceMutationInput;
}

async function assertInvoiceReferencesExist(customerId: string, estimateId: string | null) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (estimateId) {
    const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });

    if (!estimate) {
      throw new Error("Estimate not found.");
    }
  }
}

export async function createInvoice(input: InvoiceMutationInput) {
  await ensureSeededState();
  const invoice = validateInvoiceInput(input);
  await assertInvoiceReferencesExist(invoice.customerId, invoice.estimateId);

  return prisma.invoice.create({
    data: toInvoiceRecord({
      id: `inv_${Date.now()}`,
      ...invoice,
    }),
  });
}

export async function updateInvoice(id: string, input: InvoiceMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Invoice id is required.");
  }

  const invoice = validateInvoiceInput(input);
  await assertInvoiceReferencesExist(invoice.customerId, invoice.estimateId);

  return prisma.invoice.update({
    where: { id },
    data: toInvoiceRecord({
      id,
      ...invoice,
    }),
  });
}

export async function deleteInvoice(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Invoice id is required.");
  }

  const paymentCount = await prisma.payment.count({ where: { invoiceId: id } });

  if (paymentCount > 0) {
    throw new Error("Invoice cannot be deleted while payments still reference the record.");
  }

  return prisma.invoice.delete({ where: { id } });
}

type EstimateMutationInput = Omit<Estimate, "id">;

function validateEstimateInput(input: EstimateMutationInput) {
  const customerId = input.customerId.trim();
  const service = input.service.trim();
  const amount = Number(input.amount);
  const createdAt = input.createdAt.trim();

  if (!customerId || !service || !createdAt || !Number.isFinite(amount) || amount < 0) {
    throw new Error("Estimate customer, service, amount, and created date are required.");
  }

  const parsedCreatedAt = new Date(createdAt);

  if (Number.isNaN(parsedCreatedAt.getTime())) {
    throw new Error("Estimate created date is invalid.");
  }

  return {
    customerId,
    service,
    amount: Math.round(amount),
    status: input.status,
    createdAt,
  } satisfies EstimateMutationInput;
}

async function assertEstimateCustomerExists(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!customer) {
    throw new Error("Customer not found.");
  }
}

export async function createEstimate(input: EstimateMutationInput) {
  await ensureSeededState();
  const estimate = validateEstimateInput(input);
  await assertEstimateCustomerExists(estimate.customerId);

  return prisma.estimate.create({
    data: toEstimateRecord({
      id: `e_${Date.now()}`,
      ...estimate,
    }),
  });
}

export async function updateEstimate(id: string, input: EstimateMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  const estimate = validateEstimateInput(input);
  await assertEstimateCustomerExists(estimate.customerId);

  return prisma.estimate.update({
    where: { id },
    data: toEstimateRecord({
      id,
      ...estimate,
    }),
  });
}

export async function deleteEstimate(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  return prisma.estimate.delete({ where: { id } });
}

export async function approveEstimate(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  return prisma.estimate.update({
    where: { id },
    data: { status: "approved" },
  });
}

export async function declineEstimate(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  return prisma.estimate.update({
    where: { id },
    data: { status: "declined" },
  });
}

export async function convertEstimateToJob(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate) {
    throw new Error("Estimate not found.");
  }

  const technician = await prisma.technician.findFirst({ orderBy: { utilizationPercent: "desc" } });

  if (!technician) {
    throw new Error("No technician available for conversion.");
  }

  const createdAt = new Date();
  const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const job = await prisma.job.create({
    data: {
      id: `j_${Date.now()}`,
      customerId: estimate.customerId,
      service: estimate.service,
      scheduledAt,
      status: "scheduled",
      technicianId: technician.id,
      emergency: false,
    },
  });

  return {
    estimate,
    job,
    createdAt,
  };
}

export async function convertEstimateToInvoice(id: string, dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Estimate id is required.");
  }

  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate) {
    throw new Error("Estimate not found.");
  }

  const customer = await prisma.customer.findUnique({ where: { id: estimate.customerId } });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const invoice = await prisma.invoice.create({
    data: {
      id: `inv_${Date.now()}`,
      customerId: estimate.customerId,
      estimateId: estimate.id,
      amount: estimate.amount,
      dueDate,
      status: "open",
      billingCycle: customer.activePlan === "none" ? "one_time" : customer.activePlan,
    },
  });

  return {
    estimate,
    invoice,
  };
}

type InventoryMutationInput = Omit<InventoryItem, "id">;

function validateInventoryInput(input: InventoryMutationInput) {
  const name = input.name.trim();
  const unit = input.unit.trim();
  const quantity = Number(input.quantity);
  const reorderPoint = Number(input.reorderPoint);
  const lastUpdated = input.lastUpdated.trim();

  if (!name || !unit || !lastUpdated || !Number.isFinite(quantity) || !Number.isFinite(reorderPoint)) {
    throw new Error("Inventory item name, unit, quantity, reorder point, and last updated date are required.");
  }

  const parsedLastUpdated = new Date(lastUpdated);

  if (Number.isNaN(parsedLastUpdated.getTime())) {
    throw new Error("Inventory last updated date is invalid.");
  }

  return {
    name,
    unit,
    quantity: Math.max(0, Math.round(quantity)),
    reorderPoint: Math.max(0, Math.round(reorderPoint)),
    lastUpdated,
  } satisfies InventoryMutationInput;
}

export async function createInventoryItem(input: InventoryMutationInput) {
  await ensureSeededState();
  const item = validateInventoryInput(input);

  return prisma.inventoryItem.create({
    data: toInventoryRecord({
      id: `m_${Date.now()}`,
      ...item,
    }),
  });
}

export async function updateInventoryItem(id: string, input: InventoryMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Inventory item id is required.");
  }

  const item = validateInventoryInput(input);

  return prisma.inventoryItem.update({
    where: { id },
    data: toInventoryRecord({
      id,
      ...item,
    }),
  });
}

export async function deleteInventoryItem(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Inventory item id is required.");
  }

  return prisma.inventoryItem.delete({ where: { id } });
}

export async function adjustInventoryQuantity(id: string, delta: number) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Inventory item id is required.");
  }

  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Inventory adjustment must be a non-zero number.");
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  return prisma.inventoryItem.update({
    where: { id },
    data: {
      quantity: Math.max(0, item.quantity + Math.round(delta)),
      lastUpdated: new Date(),
    },
  });
}

type AutomationEventMutationInput = Omit<AutomationEvent, "id">;

function validateAutomationEventInput(input: AutomationEventMutationInput) {
  const target = input.target.trim();
  const scheduledFor = input.scheduledFor.trim();

  if (!target || !scheduledFor) {
    throw new Error("Automation event target and scheduled date are required.");
  }

  const parsedScheduledFor = new Date(scheduledFor);

  if (Number.isNaN(parsedScheduledFor.getTime())) {
    throw new Error("Automation event scheduled date is invalid.");
  }

  return {
    type: input.type,
    target,
    status: input.status,
    scheduledFor,
  } satisfies AutomationEventMutationInput;
}

export async function createAutomationEvent(input: AutomationEventMutationInput) {
  await ensureSeededState();
  const event = validateAutomationEventInput(input);

  return prisma.automationEvent.create({
    data: toAutomationEventRecord({
      id: `a_${Date.now()}`,
      ...event,
    }),
  });
}

export async function updateAutomationEvent(id: string, input: AutomationEventMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Automation event id is required.");
  }

  const event = validateAutomationEventInput(input);

  return prisma.automationEvent.update({
    where: { id },
    data: toAutomationEventRecord({
      id,
      ...event,
    }),
  });
}

export async function deleteAutomationEvent(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Automation event id is required.");
  }

  return prisma.automationEvent.delete({ where: { id } });
}

export async function setAutomationEventStatus(id: string, status: AutomationEvent["status"]) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Automation event id is required.");
  }

  return prisma.automationEvent.update({
    where: { id },
    data: {
      status,
    },
  });
}

type AdminUserMutationInput = {
  name: string;
  role: "owner" | "dispatch" | "technician" | "accountant";
  twoFactorEnabled: boolean;
};

function validateAdminUserInput(input: AdminUserMutationInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Admin user name is required.");
  }

  return {
    name,
    role: input.role,
    twoFactorEnabled: Boolean(input.twoFactorEnabled),
  } satisfies AdminUserMutationInput;
}

async function countOwnerUsers() {
  return prisma.adminUser.count({ where: { role: "owner" } });
}

function getLinkedAdminUserId(technicianId: string) {
  return `admin_tech_${technicianId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function deriveUtilizationPercent(dbJobs: Array<{ technicianId: string; status: Job["status"] }>, technicianId: string) {
  const activeJobCount = dbJobs.filter(
    (job) => job.technicianId === technicianId && (job.status === "scheduled" || job.status === "in_progress"),
  ).length;

  if (activeJobCount <= 0) {
    return 0;
  }

  // Approximate utilization based on a 5-slot active daily capacity.
  return Math.min(100, Math.round((activeJobCount / 5) * 100));
}

export async function createAdminUser(input: AdminUserMutationInput) {
  await ensureSeededState();
  const user = validateAdminUserInput(input);

  const createdUser = await prisma.adminUser.create({
    data: {
      id: `u_${Date.now()}`,
      ...user,
    },
  });

  return createdUser;
}

export async function updateAdminUser(id: string, input: AdminUserMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Admin user id is required.");
  }

  const current = await prisma.adminUser.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Admin user not found.");
  }

  const user = validateAdminUserInput(input);

  if (current.role === "owner" && user.role !== "owner") {
    const ownerCount = await countOwnerUsers();

    if (ownerCount <= 1) {
      throw new Error("At least one owner account must remain active.");
    }
  }

  const updatedUser = await prisma.adminUser.update({
    where: { id },
    data: user,
  });

  return updatedUser;
}

export async function deleteAdminUser(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Admin user id is required.");
  }

  const current = await prisma.adminUser.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Admin user not found.");
  }

  if (current.role === "owner") {
    const ownerCount = await countOwnerUsers();

    if (ownerCount <= 1) {
      throw new Error("At least one owner account must remain active.");
    }
  }

  return prisma.adminUser.delete({ where: { id } });
}

export async function toggleAdminUserTwoFactor(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Admin user id is required.");
  }

  const current = await prisma.adminUser.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Admin user not found.");
  }

  return prisma.adminUser.update({
    where: { id },
    data: { twoFactorEnabled: !current.twoFactorEnabled },
  });
}

type TechnicianMutationInput = {
  name: string;
  status: "available" | "in_route" | "on_job" | "off_shift";
};

type TechnicianDedupeResult = {
  groupsResolved: number;
  deletedTechnicians: number;
  reassignedJobs: number;
};

function normalizeTechnicianName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function findTechnicianWithSameName(name: string, excludeId?: string) {
  const normalized = normalizeTechnicianName(name);

  if (!normalized) {
    return null;
  }

  const dbTechnicians = await prisma.technician.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  return dbTechnicians.find((technician) => {
    if (excludeId && technician.id === excludeId) {
      return false;
    }

    return normalizeTechnicianName(technician.name) === normalized;
  }) ?? null;
}

function isLinkedAdminTechnicianId(id: string) {
  return id.startsWith("tech_admin_");
}

function pickPrimaryTechnician(
  group: Array<{ id: string; name: string; status: "available" | "in_route" | "on_job" | "off_shift"; utilizationPercent: number }>,
  jobCountByTechnicianId: Map<string, number>,
) {
  return [...group].sort((a, b) => {
    const aLinkedPenalty = isLinkedAdminTechnicianId(a.id) ? 1 : 0;
    const bLinkedPenalty = isLinkedAdminTechnicianId(b.id) ? 1 : 0;

    if (aLinkedPenalty !== bLinkedPenalty) {
      return aLinkedPenalty - bLinkedPenalty;
    }

    const aJobCount = jobCountByTechnicianId.get(a.id) ?? 0;
    const bJobCount = jobCountByTechnicianId.get(b.id) ?? 0;

    if (aJobCount !== bJobCount) {
      return bJobCount - aJobCount;
    }

    return a.id.localeCompare(b.id);
  })[0];
}

function validateTechnicianInput(input: TechnicianMutationInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Technician name is required.");
  }

  return {
    name,
    status: input.status,
  } satisfies TechnicianMutationInput;
}

export async function createTechnician(input: TechnicianMutationInput) {
  await ensureSeededState();
  const tech = validateTechnicianInput(input);

  const existing = await findTechnicianWithSameName(tech.name);

  if (existing) {
    throw new Error(`Technician \"${existing.name}\" already exists.`);
  }

  const createdTechnician = await prisma.technician.create({
    data: {
      id: `tech_${Date.now()}`,
      ...tech,
      utilizationPercent: 0,
    },
  });

  return createdTechnician;
}

export async function updateTechnician(id: string, input: TechnicianMutationInput) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Technician id is required.");
  }

  const current = await prisma.technician.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Technician not found.");
  }

  const tech = validateTechnicianInput(input);

  const existing = await findTechnicianWithSameName(tech.name, id);

  if (existing) {
    throw new Error(`Technician \"${existing.name}\" already exists.`);
  }

  const updatedTechnician = await prisma.technician.update({
    where: { id },
    data: tech,
  });

  return updatedTechnician;
}

export async function deleteTechnician(id: string) {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Technician id is required.");
  }

  const current = await prisma.technician.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Technician not found.");
  }

  const jobsAssigned = await prisma.job.count({ where: { technicianId: id } });

  if (jobsAssigned > 0) {
    throw new Error("Cannot delete technician with assigned jobs. Reassign or complete jobs first.");
  }

  const deletedTechnician = await prisma.technician.delete({ where: { id } });

  await prisma.adminUser.deleteMany({
    where: {
      id: getLinkedAdminUserId(id),
      role: "technician",
    },
  });

  return deletedTechnician;
}

export async function setTechnicianAvailability(id: string, status: "available" | "in_route" | "on_job" | "off_shift") {
  await ensureSeededState();

  if (!id.trim()) {
    throw new Error("Technician id is required.");
  }

  return prisma.technician.update({
    where: { id },
    data: { status },
  });
}

export async function dedupeTechniciansByName(): Promise<TechnicianDedupeResult> {
  await ensureSeededState();

  return prisma.$transaction(async (tx) => {
    const [dbTechnicians, dbJobs] = await Promise.all([
      tx.technician.findMany({ orderBy: { id: "asc" } }),
      tx.job.findMany({ select: { technicianId: true } }),
    ]);

    const groups = new Map<string, typeof dbTechnicians>();

    for (const technician of dbTechnicians) {
      const key = normalizeTechnicianName(technician.name);
      const bucket = groups.get(key) ?? [];
      bucket.push(technician);
      groups.set(key, bucket);
    }

    const jobCountByTechnicianId = new Map<string, number>();

    for (const job of dbJobs) {
      jobCountByTechnicianId.set(job.technicianId, (jobCountByTechnicianId.get(job.technicianId) ?? 0) + 1);
    }

    let groupsResolved = 0;
    let deletedTechnicians = 0;
    let reassignedJobs = 0;

    for (const group of groups.values()) {
      if (group.length <= 1) {
        continue;
      }

      groupsResolved += 1;
      const primary = pickPrimaryTechnician(group, jobCountByTechnicianId);

      for (const duplicate of group) {
        if (duplicate.id === primary.id) {
          continue;
        }

        const reassignment = await tx.job.updateMany({
          where: { technicianId: duplicate.id },
          data: { technicianId: primary.id },
        });

        reassignedJobs += reassignment.count;
        deletedTechnicians += 1;

        await tx.technician.delete({ where: { id: duplicate.id } });
        await tx.adminUser.deleteMany({
          where: {
            id: getLinkedAdminUserId(duplicate.id),
            role: "technician",
          },
        });
      }
    }

    return {
      groupsResolved,
      deletedTechnicians,
      reassignedJobs,
    } satisfies TechnicianDedupeResult;
  });
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

export function getReportingDateRange(state: AdminState, fromDate: Date, toDate: Date) {
  return {
    payments: state.payments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= fromDate && paymentDate <= toDate;
    }),
    jobs: state.jobs.filter((job) => {
      const jobDate = new Date(job.scheduledAt);
      return jobDate >= fromDate && jobDate <= toDate;
    }),
    invoices: state.invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.dueDate);
      return invoiceDate >= fromDate && invoiceDate <= toDate;
    }),
    estimates: state.estimates.filter((estimate) => {
      const estimateDate = new Date(estimate.createdAt);
      return estimateDate >= fromDate && estimateDate <= toDate;
    }),
  };
}

export function getDatePreset(preset: "today" | "last_7_days" | "last_30_days") {
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);

  const fromDate = new Date(toDate);

  if (preset === "today") {
    fromDate.setHours(0, 0, 0, 0);
  } else if (preset === "last_7_days") {
    fromDate.setDate(fromDate.getDate() - 7);
    fromDate.setHours(0, 0, 0, 0);
  } else if (preset === "last_30_days") {
    fromDate.setDate(fromDate.getDate() - 30);
    fromDate.setHours(0, 0, 0, 0);
  }

  return { fromDate, toDate };
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
