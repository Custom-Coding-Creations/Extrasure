import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AssuranceRibbon, DashboardCard, InsightList, SignalMeter, StatKpi, StatusBadge, TimelinePanel } from "@/components/account/protection-ui";
import { logoutCustomer, updateCustomerProfileAction } from "@/app/account/actions";
import { buildProfileDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  searchParams?: Promise<{ status?: string }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "No visit logged yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AccountProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);
  const params = searchParams ? await searchParams : undefined;

  if (!snapshot) {
    redirect("/account/login");
  }

  const { lastServiceDate, addressSummary, propertyInsights, profileReadinessScore, profileTimeline, trustItems } =
    buildProfileDashboardMetrics(snapshot);
  const statusBanner =
    params?.status === "updated"
      ? {
          tone: "success" as const,
          title: "Property profile updated",
          detail: "Your account and property details were saved successfully.",
        }
      : params?.status === "invalid"
        ? {
            tone: "warning" as const,
            title: "We need a few essentials",
            detail: "Name, phone, and city are required before we can update your profile.",
          }
        : null;
  const shellState = await buildAccountShellState(snapshot, "profile");

  return (
    <AccountShell
      title="Property & Account"
      subtitle="Manage your property profile, improve service readiness, and understand the intelligence shaping your protection experience."
      activePath="/account/profile"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      {statusBanner ? (
        <section className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 dark:border-[#4f6953] dark:bg-[#23392d]">
          <StatusBadge tone={statusBanner.tone} label={statusBanner.title} />
          <p className="mt-3 text-sm text-[#33453a] dark:text-[#d8cbb0]">{statusBanner.detail}</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Property Snapshot" subtitle="Service-ready details and operational property context">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatKpi label="Service city" value={snapshot.customer.city} detail="Primary service territory" />
            <StatKpi label="Last treatment" value={formatDate(lastServiceDate)} detail={lastServiceDate ? "Most recent completed visit on file" : "Schedule your first visit"} />
            <StatKpi label="Lifecycle" value={humanize(snapshot.customer.lifecycle)} detail="Current account standing" />
          </div>
          <div className="mt-4 rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#61776c] dark:text-[#cabda2]">Property record</p>
            <p className="mt-2 text-base text-[#173126] dark:text-[#f1e7d2]">{addressSummary || "Add your address to improve technician routing and preparation guidance."}</p>
          </div>
        </DashboardCard>

        <DashboardCard title="Property Intelligence" subtitle="Rule-based insights from your current account and service profile">
          <div className="grid gap-3">
            <SignalMeter
              label="Profile readiness"
              value={profileReadinessScore}
              tone={profileReadinessScore >= 82 ? "success" : profileReadinessScore >= 62 ? "warning" : "danger"}
              summary="Readiness reflects data completeness for routing, safety prep, and account guidance quality."
            />
            <InsightList items={propertyInsights} />
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Profile Timeline" subtitle="Critical profile signals that shape operations">
          <TimelinePanel events={profileTimeline} />
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Property & Account Details" subtitle="Keep your routing, contact, and protection profile accurate">
          <form action={updateCustomerProfileAction} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="name">Name</label>
              <input id="name" name="name" required defaultValue={snapshot.customer.name} className="field mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="email">Email</label>
              <input id="email" value={snapshot.customer.email} disabled readOnly className="field mt-1 cursor-not-allowed opacity-80" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" required defaultValue={snapshot.customer.phone} className="field mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="city">City</label>
              <input id="city" name="city" required defaultValue={snapshot.customer.city} className="field mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="addressLine1">Address line 1</label>
              <input id="addressLine1" name="addressLine1" defaultValue={snapshot.customer.addressLine1 ?? ""} className="field mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="addressLine2">Address line 2</label>
              <input id="addressLine2" name="addressLine2" defaultValue={snapshot.customer.addressLine2 ?? ""} className="field mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="postalCode">Postal code</label>
              <input id="postalCode" name="postalCode" defaultValue={snapshot.customer.postalCode ?? ""} className="field mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267] dark:text-[#cabda2]" htmlFor="stateProvince">State / Province</label>
              <input id="stateProvince" name="stateProvince" defaultValue={snapshot.customer.stateProvince ?? ""} className="field mt-1" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[#647a6f] dark:text-[#cdbfa4]">These details improve technician routing, appointment prep, and support guidance.</p>
              <button type="submit" className="elevated-action rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]">
                Save Property Profile
              </button>
            </div>
          </form>
        </DashboardCard>

        <AccountAiAssistantCard
          context={{
            currentPage: "Property & Account",
            pageSummary: "Property profile editing, intelligence insights, and trust/safety guidance.",
            customerName: snapshot.customer.name,
            activePlan: humanize(snapshot.customer.activePlan),
            lifecycle: humanize(snapshot.customer.lifecycle),
            city: snapshot.customer.city,
            lastServiceDate: formatDate(lastServiceDate),
            propertyAddress: addressSummary,
          }}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Trust & Safety" subtitle="What ExtraSure documents and communicates to keep treatment professional and clear">
          <AssuranceRibbon items={trustItems} />
        </DashboardCard>

        <DashboardCard title="Coverage Signals" subtitle="Key indicators that influence the health of your property profile">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatKpi label="Address confidence" value={snapshot.customer.addressLine1 ? "High" : "Needs address"} detail="Complete property details improve visit readiness" />
            <StatKpi label="Contact readiness" value={snapshot.customer.phone ? "Verified" : "Missing phone"} detail="Phone helps same-day service coordination" />
            <StatKpi label="Protection readiness" value={lastServiceDate ? "Active history" : "New profile"} detail="Service history improves AI recommendations" />
            <StatKpi label="Plan linkage" value={humanize(snapshot.customer.activePlan)} detail="Connected to billing and service cadence" />
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Alert Preferences" subtitle="Choose which proactive dashboard alerts you want to receive">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
            <p className="text-sm text-[#33453a] dark:text-[#d8ccb0]">
              Customize protection risk, billing, visit, and profile completeness alerts without losing account coverage visibility.
            </p>
            <Link
              href="/account/profile/alerts"
              className="elevated-action rounded-full bg-[#163526] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
            >
              Manage Alerts
            </Link>
          </div>
        </DashboardCard>
      </section>
    </AccountShell>
  );
}
