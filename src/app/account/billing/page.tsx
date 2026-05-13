import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AssuranceRibbon, DashboardCard, SignalMeter, StatKpi, StatusBadge, TimelinePanel } from "@/components/account/protection-ui";
import { logoutCustomer, openCustomerBillingPortal, updateCustomerSubscriptionAction } from "@/app/account/actions";
import { buildBillingDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams?: Promise<{ stripe?: string }>;
};

function subscriptionLabel(status: string | null) {
  if (!status) {
    return "No Stripe subscription on file";
  }

  return status.replace("_", " ");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function planLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function subscriptionTone(status: string | null) {
  if (!status) {
    return "warning" as const;
  }

  if (status === "active" || status === "trialing") {
    return "success" as const;
  }

  if (status.includes("past_due") || status.includes("unpaid")) {
    return "danger" as const;
  }

  return "warning" as const;
}

function billingBanner(searchValue: string | undefined) {
  switch (searchValue) {
    case "portal_return":
      return {
        tone: "info" as const,
        title: "Protection Plan refreshed",
        detail: "Your billing preferences were updated securely in Stripe.",
      };
    case "subscription_pause":
      return {
        tone: "warning" as const,
        title: "Plan paused",
        detail: "Recurring billing is paused. Coverage terms may change if service remains inactive.",
      };
    case "subscription_resume":
      return {
        tone: "success" as const,
        title: "Plan active again",
        detail: "Your recurring protection coverage has resumed successfully.",
      };
    case "subscription_cancel":
      return {
        tone: "warning" as const,
        title: "Cancellation scheduled",
        detail: "Your plan will end at the current term boundary unless reactivated earlier.",
      };
    case "subscription_error":
      return {
        tone: "danger" as const,
        title: "We could not update your plan",
        detail: "Please try again or open support if you need immediate help with billing.",
      };
    default:
      return null;
  }
}

export default async function AccountBillingPage({ searchParams }: BillingPageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const params = searchParams ? await searchParams : undefined;
  const banner = billingBanner(params?.stripe);
  const {
    openInvoices,
    openBalance,
    lastInvoice,
    lastPayment,
    billingConfidenceScore,
    billingTimeline,
    billingAssurance,
  } = buildBillingDashboardMetrics(snapshot);
  const shellState = await buildAccountShellState(snapshot, "billing");

  return (
    <AccountShell
      title="Protection Plan"
      subtitle="Manage billing confidently with clear plan status, upcoming charges, and secure payment controls."
      activePath="/account/billing"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      {banner ? (
        <section className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 dark:border-[#4f6953] dark:bg-[#23392d]">
          <StatusBadge tone={banner.tone} label={banner.title} />
          <p className="mt-3 text-sm text-[#33453a] dark:text-[#d8cbb0]">{banner.detail}</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard title="Plan Overview" subtitle="Coverage, billing health, and autopay confidence">
          <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-[#d8ccaf] bg-[#fffcf5] p-5 dark:border-[#4d6751] dark:bg-[#1f3328]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge tone={subscriptionTone(snapshot.customer.stripeSubscriptionStatus)} label={subscriptionLabel(snapshot.customer.stripeSubscriptionStatus)} />
                <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e7d1]">{planLabel(snapshot.customer.activePlan)}</p>
              </div>
              <p className="mt-4 text-2xl text-[#183126] dark:text-[#f1e7d2]">Your home protection plan is {openInvoices.length === 0 ? "in excellent standing" : "ready for attention"}.</p>
              <p className="mt-2 text-sm text-[#40574a] dark:text-[#d5c8ad]">
                {openInvoices.length === 0
                  ? "No outstanding billing issues were detected. Your next charges should process normally."
                  : `${openInvoices.length} open billing item${openInvoices.length > 1 ? "s" : ""} could affect uninterrupted service if left unresolved.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/account/billing/payment-methods"
                  className="elevated-action rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
                >
                  Manage Payment Methods
                </Link>
                <form action={openCustomerBillingPortal}>
                  <button
                    type="submit"
                    className="elevated-action rounded-full border border-[#d0c4aa] bg-[#fffcf5] px-5 py-2 text-sm font-semibold text-[#163526] transition hover:bg-[#f8efdc] dark:border-[#4e6851] dark:bg-[#1f3328] dark:text-[#efe6d0]"
                  >
                    Open Stripe Billing Portal
                  </button>
                </form>
                <Link
                  href="/account/invoices"
                  className="elevated-action rounded-full border border-[#d0c4aa] bg-[#fffcf5] px-5 py-2 text-sm font-semibold text-[#163526] hover:bg-[#f8efdc] dark:border-[#4e6851] dark:bg-[#1f3328] dark:text-[#efe6d0]"
                >
                  Review Billing Records
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              <StatKpi label="Open balance" value={formatCurrency(openBalance)} detail="Outstanding invoice total" />
              <StatKpi label="Last invoice" value={lastInvoice ? formatCurrency(lastInvoice.amount) : "None"} detail={lastInvoice ? `Due ${formatDate(lastInvoice.dueDate)}` : "No invoice history yet"} />
              <StatKpi label="Last payment" value={lastPayment ? formatCurrency(lastPayment.amount) : "None"} detail={lastPayment ? `Captured ${formatDate(lastPayment.createdAt)}` : "No payment history yet"} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Billing Confidence" subtitle="What your plan includes operationally">
          <div className="grid gap-3">
            <SignalMeter
              label="Billing confidence"
              value={billingConfidenceScore}
              tone={billingConfidenceScore >= 80 ? "success" : billingConfidenceScore >= 62 ? "warning" : "danger"}
              summary="Confidence combines subscription standing, unresolved balances, and recent billing behavior."
            />
            <StatKpi label="Auto-pay" value={snapshot.customer.stripeCustomerId ? "Enabled via Stripe" : "Not linked"} detail="Managed securely through the customer billing portal" />
            <StatKpi label="Coverage cadence" value={snapshot.customer.stripeSubscriptionId ? "Recurring" : "Manual"} detail="Billing structure linked to your protection plan" />
            <StatKpi label="Support path" value="Priority ready" detail="Questions about charges can be routed through Support & Guidance" />
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Billing Timeline" subtitle="Recent invoice sequence and operational status">
          {billingTimeline.length ? (
            <TimelinePanel events={billingTimeline} />
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              Your billing timeline will appear after the first invoice event is recorded.
            </div>
          )}
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Plan Actions" subtitle="Adjust recurring protection billing when needed">
          {snapshot.customer.stripeSubscriptionId ? (
            <div className="grid gap-3">
              <form action={updateCustomerSubscriptionAction} className="rounded-2xl border border-[#dccfb5] bg-[#fffaf0] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                <input type="hidden" name="action" value="pause" />
                <p className="text-base font-semibold text-[#183126] dark:text-[#efe6d1]">Pause plan billing</p>
                <p className="mt-1 text-sm text-[#40584a] dark:text-[#d4c7ab]">Useful for short-term travel or temporary service interruptions.</p>
                <button type="submit" className="mt-4 rounded-full border border-[#8c693f] px-4 py-2 text-sm font-semibold text-[#8c693f] transition hover:bg-[#8c693f] hover:text-white">
                  Pause Plan
                </button>
              </form>
              <form action={updateCustomerSubscriptionAction} className="rounded-2xl border border-[#dccfb5] bg-[#fffaf0] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                <input type="hidden" name="action" value="resume" />
                <p className="text-base font-semibold text-[#183126] dark:text-[#efe6d1]">Resume recurring protection</p>
                <p className="mt-1 text-sm text-[#40584a] dark:text-[#d4c7ab]">Reactivates recurring billing for uninterrupted protection service cadence.</p>
                <button type="submit" className="mt-4 rounded-full border border-[#4f6f49] px-4 py-2 text-sm font-semibold text-[#3e5a37] transition hover:bg-[#3e5a37] hover:text-white">
                  Resume Plan
                </button>
              </form>
              <form action={updateCustomerSubscriptionAction} className="rounded-2xl border border-[#dccfb5] bg-[#fffaf0] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                <input type="hidden" name="action" value="cancel" />
                <p className="text-base font-semibold text-[#183126] dark:text-[#efe6d1]">Cancel at term end</p>
                <p className="mt-1 text-sm text-[#40584a] dark:text-[#d4c7ab]">Ends the plan after the current period while preserving already-billed coverage.</p>
                <button type="submit" className="mt-4 rounded-full border border-[#8a3d22] px-4 py-2 text-sm font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">
                  Schedule Cancellation
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="font-semibold text-[#183126] dark:text-[#efe5cf]">No recurring subscription is linked yet.</p>
              <p className="mt-2">Open the billing portal to add or confirm your payment setup.</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Recent Billing Activity" subtitle="A simpler explanation of your most recent charge history">
          <div className="space-y-3">
            {snapshot.invoices.slice(0, 4).map((invoice) => (
              <article key={invoice.id} className="rounded-2xl border border-[#d8cbaf] bg-[#fffdf6] p-4 dark:border-[#4b6650] dark:bg-[#1f3328]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-[#1b2f25] dark:text-[#f0e5cf]">{formatCurrency(invoice.amount)}</p>
                  <StatusBadge tone={invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "info"} label={invoice.status.replace("_", " ")} />
                </div>
                <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">{invoice.billingCycle.replace("_", " ")} billing cycle · due {formatDate(invoice.dueDate)}</p>
                <p className="mt-2 text-sm text-[#41584a] dark:text-[#d3c6ab]">
                  {invoice.status === "paid"
                    ? "Payment processed successfully and logged in your billing records."
                    : "This charge may need review to keep future service visits on schedule."}
                </p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Plan Assurance" subtitle="Built-in safeguards for billing and coverage integrity">
          <AssuranceRibbon items={billingAssurance} />
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Protection Plan",
            pageSummary: "Subscription status, open balance, billing confidence, payment controls, and recent charge explanations.",
            customerName: snapshot.customer.name,
            activePlan: planLabel(snapshot.customer.activePlan),
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
