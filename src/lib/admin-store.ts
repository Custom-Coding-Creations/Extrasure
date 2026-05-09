import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
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

const STATE_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(STATE_DIR, "admin-state.json");

function cloneSeedState(): AdminState {
  return JSON.parse(
    JSON.stringify({
      adminUsers,
      customers,
      technicians,
      jobs,
      estimates,
      invoices,
      payments,
      automationEvents,
      inventory,
    }),
  ) as AdminState;
}

async function ensureStateFile() {
  await mkdir(STATE_DIR, { recursive: true });

  try {
    await readFile(STATE_FILE, "utf8");
  } catch {
    await writeFile(STATE_FILE, JSON.stringify(cloneSeedState(), null, 2), "utf8");
  }
}

export async function getAdminState() {
  await ensureStateFile();
  const raw = await readFile(STATE_FILE, "utf8");

  return JSON.parse(raw) as AdminState;
}

export async function saveAdminState(state: AdminState) {
  await ensureStateFile();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export async function queuePaymentRetry(invoiceId: string) {
  const state = await getAdminState();
  const invoice = state.invoices.find((item) => item.id === invoiceId);

  if (!invoice) {
    return {
      ok: false,
      error: "Invoice not found",
    } as const;
  }

  const retryEventId = `a_retry_${Date.now()}`;
  const retryPaymentId = `pay_retry_${Date.now()}`;

  state.automationEvents.unshift({
    id: retryEventId,
    type: "failed_payment_retry",
    target: invoiceId,
    status: "queued",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
  });

  state.payments.unshift({
    id: retryPaymentId,
    invoiceId,
    method: "card",
    status: "pending",
    amount: invoice.amount,
    createdAt: new Date().toISOString(),
  });

  await saveAdminState(state);

  return {
    ok: true,
    invoice,
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
