import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { AccountHomeDashboard } from "@/components/account/account-home-dashboard";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { buildAccountHomeIntelligence } from "@/lib/account-home-intelligence";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { logoutCustomer } from "@/app/account/actions";

export const dynamic = "force-dynamic";

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

  const intelligence = buildAccountHomeIntelligence(snapshot);
  const openBalance = snapshot.invoices.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.amount, 0);

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

      <AccountHomeDashboard
        intelligence={intelligence}
        planLabel={toPlanLabel(snapshot.customer.activePlan)}
        customerName={snapshot.customer.name}
        openBalanceLabel={formatCurrency(openBalance)}
        eventCount={snapshot.timeline.length}
      />

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Home Protection",
            pageSummary: `${intelligence.summary} Recommended next moves are ranked by urgency, and the dashboard includes timeline, trust, and heatmap views.`,
            customerName: snapshot.customer.name,
            activePlan: toPlanLabel(snapshot.customer.activePlan),
            lifecycle: snapshot.customer.lifecycle,
            city: snapshot.customer.city,
            lastServiceDate: intelligence.lastServiceDate ? intelligence.lastServiceDate.toISOString() : "No completed service recorded yet",
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
