import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import {
  AssuranceRibbon,
  DashboardCard,
  IconCalendar,
  IconReceipt,
  IconShield,
  IconWave,
  InsightList,
  QuickActionCard,
  SignalMeter,
  StatKpi,
  TimelinePanel,
} from "@/components/account/protection-ui";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { logoutCustomer } from "@/app/account/actions";

export const dynamic = "force-dynamic";

const DAY_MS = 1000 * 60 * 60 * 24;

function toWholeDays(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not yet scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function toPlanLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

type AccountPageProps = {
  searchParams?: Promise<{
    stripe?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const params = searchParams ? await searchParams : undefined;
  const stripeState = params?.stripe;

  const now = new Date();
  const lastServiceDate = snapshot.customer.lastServiceDate;
  const lastServiceDaysAgo = lastServiceDate ? toWholeDays(lastServiceDate, now) : 999;
  const nextService = snapshot.jobs
    .filter((job) => job.scheduledAt.getTime() >= now.getTime())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
  const nextServiceDate = nextService?.scheduledAt ?? null;
  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== "paid");
  const openBalance = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  const baseScore = 100;
  const scorePenaltyFromService = Math.min(30, Math.floor(lastServiceDaysAgo / 6));
  const scorePenaltyFromInvoices = Math.min(20, openInvoices.length * 6);
  const scorePenaltyFromLifecycle = snapshot.customer.lifecycle === "past_due" ? 18 : 0;
  const protectionScore = Math.max(42, baseScore - scorePenaltyFromService - scorePenaltyFromInvoices - scorePenaltyFromLifecycle);

  const riskTone =
    protectionScore >= 82
      ? "success"
      : protectionScore >= 66
        ? "warning"
        : "danger";

  const seasonalSignal = now.getMonth() >= 4 && now.getMonth() <= 8 ? "Mosquito season active" : "Perimeter monitoring active";

  const aiInsights = [
    {
      id: "seasonal",
      tone: now.getMonth() >= 4 && now.getMonth() <= 8 ? ("warning" as const) : ("info" as const),
      title: seasonalSignal,
      detail:
        now.getMonth() >= 4 && now.getMonth() <= 8
          ? "Elevated mosquito activity is expected this month. Keep standing water clear and confirm your next exterior treatment window."
          : "Conditions are stable. Maintain your standard exterior barrier schedule to preserve year-round coverage.",
    },
    {
      id: "service",
      tone: lastServiceDaysAgo > 60 ? ("danger" as const) : ("success" as const),
      title: lastServiceDaysAgo > 60 ? "Treatment cadence drift" : "Service cadence on track",
      detail:
        lastServiceDaysAgo > 60
          ? "Your last completed treatment was over 60 days ago. Booking a proactive follow-up now helps keep your protection score high."
          : "Your recent treatment cadence is supporting strong protection coverage across key exterior zones.",
    },
    {
      id: "plan",
      tone: openInvoices.length > 0 ? ("warning" as const) : ("info" as const),
      title: openInvoices.length > 0 ? "Plan attention required" : "Plan status stable",
      detail:
        openInvoices.length > 0
          ? `${openInvoices.length} billing item${openInvoices.length > 1 ? "s" : ""} need attention to avoid service interruptions.`
          : "Your protection plan is in good standing and auto-pay appears healthy.",
    },
  ];

  const timelineEvents = [
    {
      id: "service-window",
      title: nextServiceDate ? `Next visit scheduled for ${formatDate(nextServiceDate)}` : "No future visit is scheduled",
      detail: nextServiceDate
        ? "Your next treatment window is booked. Keep side gates and access points clear for a faster service pass."
        : "Book a proactive visit now to maintain coverage cadence and keep protection confidence elevated.",
      badge: nextServiceDate ? "Service queued" : "Schedule now",
      tone: nextServiceDate ? ("success" as const) : ("warning" as const),
    },
    {
      id: "billing-state",
      title: openInvoices.length > 0 ? `${openInvoices.length} open billing item${openInvoices.length > 1 ? "s" : ""}` : "Billing status in good standing",
      detail:
        openInvoices.length > 0
          ? "Resolve outstanding charges to avoid disruptions to recurring treatment operations."
          : "No open balance detected. Recurring plan operations should continue without interruption.",
      badge: openInvoices.length > 0 ? "Needs review" : "Healthy",
      tone: openInvoices.length > 0 ? ("warning" as const) : ("info" as const),
    },
    {
      id: "seasonal-watch",
      title: seasonalSignal,
      detail:
        now.getMonth() >= 4 && now.getMonth() <= 8
          ? "Seasonal pressure is rising. Exterior moisture control and standing water checks can reduce exposure risk between visits."
          : "Perimeter stability is strong this period. Continue baseline prevention checks around crawlspaces and entry points.",
      badge: now.getMonth() >= 4 && now.getMonth() <= 8 ? "Seasonal risk" : "Stable",
      tone: now.getMonth() >= 4 && now.getMonth() <= 8 ? ("warning" as const) : ("success" as const),
    },
  ];

  const assuranceItems = [
    {
      id: "response",
      title: "Priority response pathway",
      detail: "AI and human support channels are pre-linked to your account context for faster issue resolution.",
    },
    {
      id: "safety",
      title: "Documented safety protocol",
      detail: "Treatment guidance and usage notes are retained in your account timeline for full transparency.",
    },
    {
      id: "continuity",
      title: "Continuity-first scheduling",
      detail: "Service cadence health and billing status are monitored together to prevent accidental protection gaps.",
    },
  ];

  const shellState = await buildAccountShellState(snapshot, "home");

  return (
    <AccountShell
      title={`${snapshot.customer.name}, your home is actively protected.`}
      subtitle="Monitor risk, upcoming service activity, billing confidence, and AI guidance from one proactive protection platform."
      activePath="/account"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      {stripeState === "portal_return" ? (
        <section className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 text-sm text-[#33453a] dark:border-[#48624e] dark:bg-[#21362b] dark:text-[#dfd3b8]">
          Protection Plan updated successfully. Your dashboard has been refreshed with the latest billing status.
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <DashboardCard
          title="Protection Status"
          subtitle="Real-time confidence for your home protection coverage"
          ctaHref="/account/services"
          ctaLabel="Review Visits"
        >
          <div className="grid gap-4">
            <SignalMeter
              label="Protection confidence"
              value={protectionScore}
              tone={riskTone}
              summary={
                protectionScore >= 82
                  ? "Coverage cadence and billing posture are aligned for strong ongoing protection."
                  : "A few account signals need attention to return to full confidence."
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <StatKpi label="Next service" value={formatDate(nextServiceDate)} detail="Scheduled protection window" />
              <StatKpi label="Last treatment" value={lastServiceDate ? `${lastServiceDaysAgo} days ago` : "No visit logged"} detail={lastServiceDate ? formatDate(lastServiceDate) : "Book your first treatment"} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Property Intelligence" subtitle="AI monitoring signals and proactive recommendations">
          <InsightList items={aiInsights} />
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Operational Timeline" subtitle="What matters most over the next few steps" ctaHref="/account/activity" ctaLabel="Open Timeline">
          <TimelinePanel events={timelineEvents} />
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard
          href="/account/services"
          eyebrow="Home Protection"
          title="Visit Operations"
          description="Track upcoming service windows, technician updates, and treatment outcomes."
          icon={<IconShield />}
        />
        <QuickActionCard
          href="/account/activity"
          eyebrow="Protection Timeline"
          title="Live Timeline"
          description={`${snapshot.timeline.length} events across service, billing, and support interactions.`}
          icon={<IconCalendar />}
        />
        <QuickActionCard
          href="/account/billing"
          eyebrow="Protection Plan"
          title={toPlanLabel(snapshot.customer.activePlan)}
          description={`Current open balance: ${formatCurrency(openBalance)}. Review plan and payment settings.`}
          icon={<IconReceipt />}
        />
        <QuickActionCard
          href="/account/notes"
          eyebrow="AI Support"
          title="Guidance Center"
          description="Ask treatment, billing, or appointment questions and get a clear next step."
          icon={<IconWave />}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <DashboardCard title="Protection Performance" subtitle="Coverage streak, account health, and retention confidence">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatKpi
              label="Coverage streak"
              value={`${Math.max(1, Math.floor((365 - Math.min(360, lastServiceDaysAgo)) / 30))} months`}
              detail="No active infestation reported"
            />
            <StatKpi label="Years protected" value={snapshot.customer.lastServiceDate ? "2+ years" : "New"} detail="Continuous plan participation" />
            <StatKpi label="Account health" value={openInvoices.length === 0 ? "Excellent" : "Needs review"} detail={openInvoices.length === 0 ? "Billing and schedule aligned" : "Resolve outstanding billing items"} />
          </div>
        </DashboardCard>

        <DashboardCard title="Trust & Safety" subtitle="Operational transparency and certified protection standards" ctaHref="/account/profile" ctaLabel="View Property">
          <ul className="grid gap-3 text-sm text-[#2f473a] dark:text-[#dccfb4]">
            <li className="rounded-2xl border border-[#d9cdb2] bg-[#fffaf0] px-4 py-3 dark:border-[#4f6953] dark:bg-[#24392e]">
              EPA-aligned treatment protocols with technician-applied usage documentation.
            </li>
            <li className="rounded-2xl border border-[#d9cdb2] bg-[#fffaf0] px-4 py-3 dark:border-[#4f6953] dark:bg-[#24392e]">
              Licensed and insured field operations with auditable service history.
            </li>
            <li className="rounded-2xl border border-[#d9cdb2] bg-[#fffaf0] px-4 py-3 dark:border-[#4f6953] dark:bg-[#24392e]">
              Family and pet safety preparation guidance included in appointment notes.
            </li>
          </ul>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Assurance Architecture" subtitle="Built-in safeguards that keep your protection program resilient">
          <AssuranceRibbon items={assuranceItems} />
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Home Protection",
            pageSummary: "Protection score, risk level, seasonal guidance, trust modules, and key account actions.",
            customerName: snapshot.customer.name,
            activePlan: toPlanLabel(snapshot.customer.activePlan),
            lifecycle: snapshot.customer.lifecycle,
            city: snapshot.customer.city,
            lastServiceDate: formatDate(lastServiceDate),
            propertyAddress: [snapshot.customer.addressLine1, snapshot.customer.city].filter(Boolean).join(", "),
          }}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-[#d8ccaf] bg-[#fff9eb] p-5 text-sm text-[#32493c] dark:border-[#4f6953] dark:bg-[#22382c] dark:text-[#d7c9ad] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#5d7368] dark:text-[#cabda2]">Sticky Mobile Action</p>
            <p className="mt-1 text-base text-[#183227] dark:text-[#f2e8d2]">Need help now? Open Support & Guidance for instant AI and team assistance.</p>
          </div>
          <Link
            href="/account/notes"
            className="elevated-action rounded-full bg-[#163526] px-5 py-2 font-semibold text-white hover:bg-[#1f4a36]"
          >
            Open Support
          </Link>
        </div>
      </section>
    </AccountShell>
  );
}
