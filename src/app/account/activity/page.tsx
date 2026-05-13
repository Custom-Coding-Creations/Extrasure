import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import { DashboardCard, PremiumEmptyState, SignalMeter, StatusBadge } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { buildActivityDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { buildAccountHomeIntelligence, buildAccountTimelineFeed } from "@/lib/account-home-intelligence";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

export default async function AccountActivityPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }
  const { timelineDepthScore, summarizedEvents, timelineAssurance, eventsLoggedCount, serviceEventsCount, billingEventsCount } =
    buildActivityDashboardMetrics(snapshot);
  const homeIntelligence = buildAccountHomeIntelligence(snapshot);
  const timelineFeed = buildAccountTimelineFeed(snapshot);
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
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="dashboard-atmosphere premium-card animated-entry overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative z-10 grid gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={timelineDepthScore >= 80 ? "success" : timelineDepthScore >= 62 ? "warning" : "info"} label="Operational timeline" />
              <span className="rounded-full border border-[#d8caad] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#335043] dark:border-[#536d57] dark:bg-[rgba(35,55,44,0.74)] dark:text-[#e0d4bc]">
                Unified event intelligence
              </span>
            </div>
            <div>
              <h2 className="max-w-3xl text-3xl leading-tight text-[#152b21] dark:text-[#f3ead7] sm:text-4xl">Your protection history is now an interactive operational feed.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#365042] dark:text-[#d6caaf]">
                Follow service milestones, billing changes, support moments, and AI reviews in one timeline designed for faster understanding and better trust.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Timeline confidence</p>
                <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{timelineDepthScore}</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Signal quality improves as billing, service, and support events remain traceable.</p>
              </article>
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Events logged</p>
                <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{eventsLoggedCount}</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Every protection interaction becomes easier to review and explain.</p>
              </article>
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">AI review state</p>
                <p className="mt-2 text-lg font-semibold text-[#193327] dark:text-[#f1e8d3]">{homeIntelligence.activeRiskHeadline}</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">The same intelligence engine on Home is now reflected inside the timeline stream.</p>
              </article>
            </div>
          </div>
        </section>

        <DashboardCard title="Timeline summary" subtitle="What the feed is telling you right now">
          <div className="grid gap-3">
            <SignalMeter
              label="Timeline confidence"
              value={timelineDepthScore}
              tone={timelineDepthScore >= 80 ? "success" : timelineDepthScore >= 62 ? "warning" : "info"}
              summary="Confidence increases as cross-functional events are captured consistently."
            />
            <article className="rounded-[1.55rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c9bca0]">Service sequence</p>
              <p className="mt-2 text-3xl text-[#173126] dark:text-[#f1e8d4]">{serviceEventsCount}</p>
              <p className="mt-1 text-sm text-[#3f5648] dark:text-[#d4c7ab]">Protection operations and scheduling milestones recorded.</p>
            </article>
            <article className="rounded-[1.55rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c9bca0]">Billing sequence</p>
              <p className="mt-2 text-3xl text-[#173126] dark:text-[#f1e8d4]">{billingEventsCount}</p>
              <p className="mt-1 text-sm text-[#3f5648] dark:text-[#d4c7ab]">Invoices, payments, and plan-state changes stay in the same narrative flow.</p>
            </article>
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard title="Live event feed" subtitle="Filterable activity across service, billing, support, and AI updates">
          {timelineFeed.items.length > 1 ? (
            <AccountHomeTimeline filters={timelineFeed.filters} items={timelineFeed.items} />
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

        <div className="grid gap-4">
          <DashboardCard title="Priority interpretation" subtitle="How the feed should be read">
            <div className="grid gap-3">
              {summarizedEvents.length ? summarizedEvents.map((event) => (
                <article key={event.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e8d4]">{event.title}</p>
                    <StatusBadge tone={event.tone} label={event.badge} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{event.detail}</p>
                </article>
              )) : (
                <PremiumEmptyState
                  eyebrow="Priority Events"
                  title="No key milestones are available yet."
                  description="As account operations begin, priority milestones will appear in this summarized stream."
                  actionHref="/account/services"
                  actionLabel="Start With Visits"
                />
              )}
            </div>
          </DashboardCard>

          <DashboardCard title="Timeline assurance" subtitle="Why the operational record stays trustworthy">
            <div className="grid gap-3">
              {timelineAssurance.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                  <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{item.detail}</p>
                </article>
              ))}
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Protection Timeline",
            pageSummary: `${homeIntelligence.summary} The activity view organizes service, billing, support, and AI reviews into one operational feed.`,
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
