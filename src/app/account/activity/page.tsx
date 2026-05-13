import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AssuranceRibbon, DashboardCard, PremiumEmptyState, SignalMeter, StatusBadge, TimelinePanel } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { buildActivityDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

type TimelineType = "invoice" | "payment" | "service" | "booking" | "note";

const eventToneMap: Record<TimelineType, "success" | "warning" | "danger" | "info"> = {
  invoice: "warning",
  payment: "success",
  service: "info",
  booking: "info",
  note: "info",
};

const eventLabelMap: Record<TimelineType, string> = {
  invoice: "Billing",
  payment: "Payment",
  service: "Service",
  booking: "Booking",
  note: "Support",
};

const eventIconMap: Record<TimelineType, string> = {
  invoice: "RI",
  payment: "PM",
  service: "SV",
  booking: "BK",
  note: "NT",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AccountActivityPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }
  const { timelineDepthScore, summarizedEvents, timelineAssurance, eventsLoggedCount, serviceEventsCount, billingEventsCount } =
    buildActivityDashboardMetrics(snapshot);
  const shellState = await buildAccountShellState(snapshot, "activity");

  return (
    <AccountShell
      title="Protection Timeline"
      subtitle="Track every billing, service, scheduling, and support milestone with clear operational visibility."
      activePath="/account/activity"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <DashboardCard title="Live Event Feed" subtitle="Most recent account activity across all protection operations">
          {snapshot.timeline.length ? (
            <div className="space-y-3">
              {snapshot.timeline.map((item) => {
                const tone = eventToneMap[item.type];

                return (
                  <article
                    key={item.id}
                    className="premium-card rounded-2xl border border-[#d8cbaf] bg-[#fffdf6] p-4 text-sm dark:border-[#4b6650] dark:bg-[#1f3328]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d3c7ad] bg-[#fff7e7] text-[0.65rem] font-bold tracking-[0.08em] text-[#163526] dark:border-[#4b6650] dark:bg-[#264036] dark:text-[#f1e7d2]">
                          {eventIconMap[item.type]}
                        </span>
                        <p className="text-base font-semibold text-[#1b2f25] dark:text-[#f0e6d1]">{item.title}</p>
                      </div>
                      <StatusBadge tone={tone} label={eventLabelMap[item.type]} />
                    </div>
                    <p className="mt-3 rounded-xl border border-[#ddd2b7] bg-[#fffaf0] px-3 py-2 text-[#33453a] dark:border-[#4f6953] dark:bg-[#23392d] dark:text-[#d8cab0]">
                      {item.detail}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.1em] text-[#5d7267] dark:text-[#c8bb9f]">
                      {formatDateTime(item.occurredAt)}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <PremiumEmptyState
              eyebrow="Protection Timeline"
              title="Your timeline will appear once your first protection event is recorded."
              description="Schedule an initial service visit to begin your full operational history across treatments, billing, and support milestones."
              actionHref="/account/services"
              actionLabel="Book Protection Visit"
              secondaryText="This timeline becomes your operational record for service, billing, and support."
            />
          )}
        </DashboardCard>

        <DashboardCard title="Timeline Summary" subtitle="Operational transparency at a glance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SignalMeter
              label="Timeline confidence"
              value={timelineDepthScore}
              tone={timelineDepthScore >= 80 ? "success" : timelineDepthScore >= 62 ? "warning" : "info"}
              summary="Confidence increases as cross-functional events are captured consistently."
            />
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c9bca0]">Events Logged</p>
              <p className="mt-2 text-3xl text-[#173126] dark:text-[#f1e8d4]">{eventsLoggedCount}</p>
              <p className="mt-1 text-sm text-[#3f5648] dark:text-[#d4c7ab]">Across billing, service, and support activity.</p>
            </article>
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c9bca0]">Service Events</p>
              <p className="mt-2 text-3xl text-[#173126] dark:text-[#f1e8d4]">
                {serviceEventsCount}
              </p>
              <p className="mt-1 text-sm text-[#3f5648] dark:text-[#d4c7ab]">Protection operations and scheduling milestones.</p>
            </article>
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c9bca0]">Billing Events</p>
              <p className="mt-2 text-3xl text-[#173126] dark:text-[#f1e8d4]">
                {billingEventsCount}
              </p>
              <p className="mt-1 text-sm text-[#3f5648] dark:text-[#d4c7ab]">Invoices, payments, and plan-related updates.</p>
            </article>
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard title="Priority Events" subtitle="Top operational milestones in sequence">
          {summarizedEvents.length ? (
            <TimelinePanel events={summarizedEvents} />
          ) : (
            <PremiumEmptyState
              eyebrow="Priority Events"
              title="No key milestones are available yet."
              description="As account operations begin, priority milestones will appear in this summarized stream."
              actionHref="/account/services"
              actionLabel="Start With Visits"
            />
          )}
        </DashboardCard>

        <DashboardCard title="Timeline Assurance" subtitle="How event reliability is maintained">
          <AssuranceRibbon items={timelineAssurance} />
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Protection Timeline",
            pageSummary: "Recent billing, service, scheduling, and support milestones across the customer account.",
            customerName: snapshot.customer.name,
            activePlan: snapshot.customer.activePlan,
            lifecycle: snapshot.customer.lifecycle,
            city: snapshot.customer.city,
            lastServiceDate: snapshot.customer.lastServiceDate ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(snapshot.customer.lastServiceDate) : "No visit logged yet",
            propertyAddress: [snapshot.customer.addressLine1, snapshot.customer.city].filter(Boolean).join(", "),
          }}
        />
      </section>
    </AccountShell>
  );
}
