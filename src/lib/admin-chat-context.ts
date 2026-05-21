import { buildAdminManualKnowledgeContext } from "@/lib/admin-manual-knowledge";
import { retrieveAdminManualContext } from "@/lib/admin-manual-retrieval";
import { getAdminState } from "@/lib/admin-store";

export type AdminChatContext = {
  confidence: "low" | "medium" | "high";
  knowledgeContext: string;
  systemPromptAddition: string;
  sourcePaths: string[];
  metrics: {
    totalCustomers: number;
    totalTechnicians: number;
    totalJobs: number;
    totalInvoices: number;
    openInvoices: number;
    succeededPaymentsLast30: number;
    paidInvoicesLast30: number;
    revenueLast30: number;
  };
};

const ADMIN_SYSTEM_PROMPT_ADDITION = [
  "You are also the internal operations copilot for authenticated admins.",
  "As an admin assistant, answer questions about the codebase, hosting, integrations, DevOps architecture, dashboard workflows, and platform troubleshooting.",
  "When asked for business metrics, use provided live data context values directly.",
  "Prefer direct, practical, step-by-step guidance with exact navigation paths in the admin dashboard.",
  "Never invent credentials, secrets, API keys, or passwords.",
  "If credentials are requested, direct the user to Admin Manual credential vault sections and secure platform consoles.",
  "Key system facts: Hosting is Vercel. Source control is GitHub. Payments use Stripe. AI uses OpenAI. Data is stored in PostgreSQL through Prisma.",
  "DNS and domain management are handled in Vercel project domains.",
  "Admin sign-in uses owner credentials or OAuth providers when configured.",
  "For sign-in troubleshooting, check ADMIN_AUTH_SECRET, callback URLs, and provider app status.",
  "For invoice and estimate tasks, explain exact admin page routes and required fields.",
].join(" ");

function parseDate(value: unknown) {
  if (!(value instanceof Date)) {
    return null;
  }

  return Number.isNaN(value.getTime()) ? null : value;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function buildLiveDataSummary() {
  try {
    const state = await getAdminState();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const paidInvoicesLast30 = state.invoices.filter((invoice) => {
      if (invoice.status !== "paid") {
        return false;
      }

      const paidAt = parseDate(invoice.paidAt);
      return paidAt ? paidAt >= thirtyDaysAgo : false;
    });

    const succeededPaymentsLast30 = state.payments.filter((payment) => {
      if (payment.status !== "succeeded") {
        return false;
      }

      const createdAt = parseDate(payment.createdAt);
      return createdAt ? createdAt >= thirtyDaysAgo : false;
    });

    const revenueLast30 = succeededPaymentsLast30.reduce((sum, payment) => sum + payment.amount, 0);
    const openInvoices = state.invoices.filter((invoice) => invoice.status === "open" || invoice.status === "past_due").length;

    const summary = [
      `Live business data snapshot (${now.toISOString().slice(0, 10)}):`,
      `- Total customers: ${state.customers.length}`,
      `- Total technicians: ${state.technicians.length}`,
      `- Total jobs: ${state.jobs.length}`,
      `- Total invoices: ${state.invoices.length}`,
      `- Open or past-due invoices: ${openInvoices}`,
      `- Succeeded payments in last 30 days: ${succeededPaymentsLast30.length}`,
      `- Paid invoices in last 30 days: ${paidInvoicesLast30.length}`,
      `- Revenue in last 30 days: ${formatMoney(revenueLast30)}`,
    ].join("\n");

    return {
      summary,
      metrics: {
        totalCustomers: state.customers.length,
        totalTechnicians: state.technicians.length,
        totalJobs: state.jobs.length,
        totalInvoices: state.invoices.length,
        openInvoices,
        succeededPaymentsLast30: succeededPaymentsLast30.length,
        paidInvoicesLast30: paidInvoicesLast30.length,
        revenueLast30,
      },
    };
  } catch {
    return {
      summary: "Live business data snapshot unavailable right now. Use manual reporting pages if current metrics are needed immediately.",
      metrics: {
        totalCustomers: 0,
        totalTechnicians: 0,
        totalJobs: 0,
        totalInvoices: 0,
        openInvoices: 0,
        succeededPaymentsLast30: 0,
        paidInvoicesLast30: 0,
        revenueLast30: 0,
      },
    };
  }
}

export async function buildAdminChatContext(message: string): Promise<AdminChatContext> {
  const [manualKnowledge, retrieval, liveData] = await Promise.all([
    Promise.resolve(buildAdminManualKnowledgeContext(message)),
    retrieveAdminManualContext(message, 4),
    buildLiveDataSummary(),
  ]);

  const knowledgeContext = [
    liveData.summary,
    "",
    "Admin manual knowledge:",
    manualKnowledge.contextText,
    "",
    "Codebase retrieval context:",
    retrieval.contextText || "No direct codebase matches found for this query.",
  ].join("\n");

  return {
    confidence: manualKnowledge.confidence,
    knowledgeContext,
    systemPromptAddition: ADMIN_SYSTEM_PROMPT_ADDITION,
    sourcePaths: retrieval.sourcePaths,
    metrics: liveData.metrics,
  };
}