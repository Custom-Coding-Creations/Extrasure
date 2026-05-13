import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import { DashboardCard, PremiumEmptyState, SignalMeter, StatKpi, StatusBadge } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { buildInvoicesDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { buildAccountHomeIntelligence, buildAccountTimelineFeed } from "@/lib/account-home-intelligence";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { getCustomerStripeInvoiceDocumentLinks } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function cycleLabel(value: string) {
  return value.replace("_", " ");
}

function invoiceTone(status: string) {
  if (status === "paid") {
    return "success" as const;
  }

  if (status === "open") {
    return "warning" as const;
  }

  if (status.includes("void") || status.includes("failed") || status.includes("uncollectible")) {
    return "danger" as const;
  }

  return "info" as const;
}

export default async function AccountInvoicesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const invoiceLinks = await Promise.all(
    snapshot.invoices.map(async (invoice) => {
      try {
        const links = await getCustomerStripeInvoiceDocumentLinks(session.customerId, invoice.id);
        return [invoice.id, links] as const;
      } catch {
        return [
          invoice.id,
          {
            stripeInvoiceId: null,
            hostedInvoiceUrl: null,
            pdfUrl: null,
          },
        ] as const;
      }
    }),
  );

  const invoiceLinkMap = new Map(invoiceLinks);
  const { paidInvoices, openInvoices, lifetimeValue, billingStabilityScore, invoiceTimeline, billingAssurance } =
    buildInvoicesDashboardMetrics(snapshot);
  const homeIntelligence = buildAccountHomeIntelligence(snapshot);
  const timelineFeed = buildAccountTimelineFeed(snapshot);
  const billingFeed = {
    filters: timelineFeed.filters.filter((filter) => filter.id === "all" || filter.id === "billing" || filter.id === "ai"),
    items: timelineFeed.items.filter((item) => item.category === "billing" || item.category === "ai"),
  };
  const shellState = await buildAccountShellState(snapshot, "invoices");
  const hostedInvoiceCount = snapshot.invoices.filter((invoice) => invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl).length;
  const pdfCount = snapshot.invoices.filter((invoice) => invoiceLinkMap.get(invoice.id)?.pdfUrl).length;

  return (
    <AccountShell
      title="Billing Records"
      subtitle="Review every invoice, understand charge timing, and access hosted or downloadable records when available."
      activePath="/account/invoices"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="dashboard-atmosphere premium-card animated-entry overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={billingStabilityScore >= 80 ? "success" : billingStabilityScore >= 60 ? "warning" : "danger"} label="Billing records" />
                <span className="rounded-full border border-[#d8caad] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#335043] dark:border-[#536d57] dark:bg-[rgba(35,55,44,0.74)] dark:text-[#e0d4bc]">
                  Invoice intelligence
                </span>
              </div>
              <div>
                <h2 className="max-w-3xl text-3xl leading-tight text-[#152b21] dark:text-[#f3ead7] sm:text-4xl">Your invoice history is organized for fast review, document access, and charge clarity.</h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#365042] dark:text-[#d6caaf]">{homeIntelligence.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <StatKpi label="Invoices" value={String(snapshot.invoices.length)} detail="Total billing records" />
                <StatKpi label="Paid" value={String(paidInvoices.length)} detail="Successfully completed charges" />
                <StatKpi label="Hosted docs" value={String(hostedInvoiceCount)} detail="Stripe hosted invoice links" />
                <StatKpi label="PDFs" value={String(pdfCount)} detail="Downloadable invoice documents" />
              </div>
            </div>

            <DashboardCard title="Attention needed" subtitle="Items that may require action">
              <div className="grid gap-3">
                <SignalMeter
                  label="Billing stability"
                  value={billingStabilityScore}
                  tone={billingStabilityScore >= 80 ? "success" : billingStabilityScore >= 60 ? "warning" : "danger"}
                  summary="Stability reflects unresolved balances and invoice settlement momentum."
                />
                <StatKpi label="Open invoices" value={String(openInvoices.length)} detail="Records not yet marked paid" />
                <StatKpi label="Lifetime billed" value={formatCurrency(lifetimeValue)} detail="Historical invoice value" />
                <Link
                  href="/account/billing"
                  className="elevated-action rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#173126] hover:bg-[#f6ebd8] dark:border-[#4c6650] dark:bg-[#22382c] dark:text-[#efe5d0]"
                >
                  Return to protection plan
                </Link>
              </div>
            </DashboardCard>
          </div>
        </section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Recent billing timeline" subtitle="Invoice sequence with due-date and status context">
          {billingFeed.items.length > 1 ? (
            <AccountHomeTimeline filters={billingFeed.filters} items={billingFeed.items} />
          ) : invoiceTimeline.length ? (
            <div className="grid gap-3">
              {invoiceTimeline.map((event) => (
                <article key={event.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e8d4]">{event.title}</p>
                    <StatusBadge tone={event.tone} label={event.badge} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{event.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              eyebrow="Billing Timeline"
              title="No invoice milestones are available yet."
              description="As invoices are generated, key billing checkpoints will appear here in sequence."
              actionHref="/account/billing"
              actionLabel="Open Protection Plan"
            />
          )}
        </DashboardCard>

        <DashboardCard title="Records assurance" subtitle="How invoice documents and records stay dependable">
          <div className="grid gap-3">
            {billingAssurance.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{item.detail}</p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Invoice Library" subtitle="Hosted links, PDFs, due dates, and payment state">
          {snapshot.invoices.length ? (
            <div className="space-y-3">
              {snapshot.invoices.map((invoice) => (
                <article key={invoice.id} className="rounded-3xl border border-[#d8cbaf] bg-[#fffdf6] p-5 dark:border-[#4b6650] dark:bg-[#1f3328]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#cabca1]">Invoice {invoice.id}</p>
                      <p className="mt-2 text-2xl text-[#183126] dark:text-[#f1e8d4]">{formatCurrency(invoice.amount)}</p>
                    </div>
                    <StatusBadge tone={invoiceTone(invoice.status)} label={invoice.status.replace("_", " ")} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#cabca1]">Due date</p>
                      <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">{formatDate(invoice.dueDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#cabca1]">Billing cycle</p>
                      <p className="mt-2 text-sm capitalize text-[#33453a] dark:text-[#d9ccb2]">{cycleLabel(invoice.billingCycle)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#cabca1]">Charge explanation</p>
                      <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">
                        {invoice.status === "paid"
                          ? "Processed successfully for your protection coverage period."
                          : "Awaiting completion or review to keep future service uninterrupted."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl ? (
                      <a
                        href={invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#4f6f49] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#3e5a37] transition hover:bg-[#3e5a37] hover:text-white"
                      >
                        View Hosted Invoice
                      </a>
                    ) : null}
                    {invoiceLinkMap.get(invoice.id)?.pdfUrl ? (
                      <a
                        href={invoiceLinkMap.get(invoice.id)?.pdfUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#6e6c4f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#545237] transition hover:bg-[#545237] hover:text-white"
                      >
                        Download PDF
                      </a>
                    ) : null}
                    {!invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl && !invoiceLinkMap.get(invoice.id)?.pdfUrl ? (
                      <span className="rounded-full border border-[#d8ccaf] bg-[#fff8ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#647a6f] dark:border-[#4e6852] dark:bg-[#22372c] dark:text-[#d0c2a7]">
                        Record available here only
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              eyebrow="Billing Records"
              title="No billing records are available yet."
              description="When your first invoice is generated, it will appear here with due dates, hosted links, and PDFs when Stripe provides them."
              actionHref="/account/billing"
              actionLabel="Open Protection Plan"
              secondaryText="Use Protection Plan to confirm payment setup and recurring billing status."
            />
          )}
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Billing Records",
            pageSummary: `${homeIntelligence.summary} This page focuses on invoice history, hosted records, PDFs, due dates, and settlement state.`,
            customerName: snapshot.customer.name,
            activePlan: cycleLabel(snapshot.customer.activePlan ?? "plan"),
            lifecycle: snapshot.customer.lifecycle,
            city: snapshot.customer.city,
            lastServiceDate: snapshot.customer.lastServiceDate ? formatDate(snapshot.customer.lastServiceDate) : "No visit logged yet",
            propertyAddress: [snapshot.customer.addressLine1, snapshot.customer.city].filter(Boolean).join(", "),
          }}
        />
      </section>
    </AccountShell>
  );
}
