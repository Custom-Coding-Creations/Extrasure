import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import { DashboardCard, SignalMeter, StatKpi, StatusBadge } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { buildServicesDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { buildAccountHomeIntelligence, buildAccountTimelineFeed } from "@/lib/account-home-intelligence";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function bookingTone(status: string) {
  if (status === "confirmed" || status === "scheduled") {
    return "success" as const;
  }

  if (status === "checkout_pending") {
    return "warning" as const;
  }

  return "info" as const;
}

function jobTone(status: string) {
  if (status === "completed") {
    return "success" as const;
  }

  if (status === "scheduled" || status === "in_progress") {
    return "warning" as const;
  }

  return "info" as const;
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AccountServicesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const { upcomingBookings, recentJobs, nextVisit, completedVisitsCount, visitHealthScore, timelineEvents, readinessAssurance } =
    buildServicesDashboardMetrics(snapshot);
  const homeIntelligence = buildAccountHomeIntelligence(snapshot);
  const timelineFeed = buildAccountTimelineFeed(snapshot);
  const serviceTimeline = {
    filters: timelineFeed.filters.filter((filter) => filter.id === "all" || filter.id === "service" || filter.id === "ai"),
    items: timelineFeed.items.filter((item) => item.category === "service" || item.category === "ai"),
  };
  const shellState = await buildAccountShellState(snapshot, "services");

  let nextVisitTone: "success" | "warning" | "danger" | "info" = "info";
  let nextVisitDateLabel = "";
  let nextVisitTitle = "Scheduled protection visit";

  if (nextVisit) {
    if ("service" in nextVisit) {
      nextVisitTone = jobTone(nextVisit.status);
      nextVisitDateLabel = formatDateTime(nextVisit.scheduledAt);
      nextVisitTitle = nextVisit.service;
    } else {
      nextVisitTone = bookingTone(nextVisit.status);
      nextVisitDateLabel = formatDate(nextVisit.preferredDate);
      nextVisitTitle = `${nextVisit.preferredWindow} at ${nextVisit.addressLine1}, ${nextVisit.city}`;
    }
  }

  return (
    <AccountShell
      title="Protection Visits"
      subtitle="See what is scheduled, what was completed, and what our team recommends next for your property."
      activePath="/account/services"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <section className="dashboard-atmosphere premium-card animated-entry overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={nextVisitTone} label={nextVisit ? humanize(nextVisit.status) : "Schedule needed"} />
                <span className="rounded-full border border-[#d8caad] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#335043] dark:border-[#536d57] dark:bg-[rgba(35,55,44,0.74)] dark:text-[#e0d4bc]">
                  Field operations view
                </span>
              </div>
              <div>
                <h2 className="max-w-3xl text-3xl leading-tight text-[#152b21] dark:text-[#f3ead7] sm:text-4xl">
                  {nextVisit ? "Your next protection window is organized around readiness, safety, and continuity." : "Your service cadence needs a new visit to keep protection confidence strong."}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#365042] dark:text-[#d6caaf]">
                  {nextVisit
                    ? "This view combines the next scheduled stop, visit readiness, and modeled property risk so you can prepare for service with clarity."
                    : "This page now highlights what is missing in the service workflow and what to do next to restore predictable coverage."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Next visit</p>
                  <p className="mt-2 text-xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{nextVisit ? nextVisitDateLabel : "Not scheduled"}</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">{nextVisit ? nextVisitTitle : "Book the next perimeter treatment to recover continuity."}</p>
                </article>
                <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Upcoming requests</p>
                  <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{upcomingBookings.length}</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Pending and confirmed windows moving through the service queue.</p>
                </article>
                <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Completed visits</p>
                  <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{completedVisitsCount}</p>
                  <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Recorded field outcomes and treatment history for the property.</p>
                </article>
              </div>
            </div>

            <div className="grid gap-4">
              <DashboardCard title="Visit readiness" subtitle="Operational transparency for every scheduled stop">
                <div className="grid gap-3">
                  <SignalMeter
                    label="Visit readiness score"
                    value={visitHealthScore}
                    tone={visitHealthScore >= 78 ? "success" : visitHealthScore >= 60 ? "warning" : "danger"}
                    summary="This score reflects schedule stability, completed service cadence, and disruption signals."
                  />
                  <StatKpi label="Property access" value="Verified" detail="Service address and contact details are on file" />
                  <StatKpi label="Follow-up guidance" value={recentJobs.length ? "Available" : "Pending first visit"} detail="Recommendations appear after each completed service" />
                </div>
              </DashboardCard>
            </div>
          </div>
        </section>

        <DashboardCard title="Visit preparation" subtitle="What the field team needs from you before arrival" ctaHref="/contact" ctaLabel="Request service">
          <div className="grid gap-3">
            <article className="rounded-[1.55rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">Access and arrival</p>
              <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">Keep side gates clear, note any locked entry points, and flag new activity before the technician arrives.</p>
            </article>
            <article className="rounded-[1.55rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">Family and pet safety</p>
              <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">Secure pets, keep children away from treated zones until dry, and review any special site notes with support if needed.</p>
            </article>
            <article className="rounded-[1.55rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
              <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">AI service watch</p>
              <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{homeIntelligence.summary}</p>
            </article>
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Service timeline" subtitle="Upcoming checkpoints, queued visits, and AI service reviews">
          {serviceTimeline.items.length > 1 ? (
            <AccountHomeTimeline filters={serviceTimeline.filters} items={serviceTimeline.items} />
          ) : timelineEvents.length ? (
            <div className="grid gap-3">
              {timelineEvents.map((event) => (
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
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              Service timeline checkpoints will appear once your next visit is queued.
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Modeled property pressure" subtitle="Where the next visit can have the biggest seasonal impact">
          <div className="grid gap-3">
            {homeIntelligence.heatmap.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e8d4]">{item.label}</p>
                  <StatusBadge tone={item.level === "high" ? "danger" : item.level === "elevated" ? "warning" : "success"} label={item.level} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{item.rationale}</p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Upcoming Requests" subtitle="Scheduling pipeline and appointment windows">
          {snapshot.bookings.length ? (
            <div className="space-y-3">
              {snapshot.bookings.map((booking) => (
                <article key={booking.id} className="rounded-2xl border border-[#d8cbaf] bg-[#fffdf6] p-4 dark:border-[#4b6650] dark:bg-[#1f3328]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[#1b2f25] dark:text-[#f0e5cf]">
                      {formatDate(booking.preferredDate)} · {booking.preferredWindow}
                    </p>
                    <StatusBadge tone={bookingTone(booking.status)} label={humanize(booking.status)} />
                  </div>
                  <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">{booking.addressLine1}, {booking.city}</p>
                  {booking.notes ? (
                    <p className="mt-3 rounded-xl border border-[#ddd2b7] bg-[#fff7e8] px-3 py-2 text-sm text-[#3d5546] dark:border-[#506a54] dark:bg-[#243a2f] dark:text-[#d5c8ad]">
                      {booking.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="font-semibold text-[#183126] dark:text-[#efe5cf]">No booking requests yet.</p>
              <p className="mt-2">When you request service, your preferred window and preparation details will appear here.</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Visit Reports" subtitle="Service history with outcomes, observations, and next-step guidance">
          {recentJobs.length ? (
            <div className="space-y-3">
              {recentJobs.map((job, index) => (
                <article key={job.id} className="rounded-3xl border border-[#d8cbaf] bg-[#fffdf6] p-5 dark:border-[#4b6650] dark:bg-[#1f3328]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#c8bba0]">Visit #{String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-2 text-xl text-[#163126] dark:text-[#f0e6d1]">{job.service}</p>
                    </div>
                    <StatusBadge tone={jobTone(job.status)} label={humanize(job.status)} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#c8bba0]">Service window</p>
                      <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">{formatDateTime(job.scheduledAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-4 dark:border-[#506a54] dark:bg-[#243a2f]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#c8bba0]">AI summary</p>
                      <p className="mt-2 text-sm text-[#33453a] dark:text-[#d9ccb2]">
                        {job.status === "completed"
                          ? "Perimeter protection visit completed. Recommended follow-up includes monitoring high-moisture and entry-point zones before the next cycle."
                          : "Visit is still active in the protection workflow. Status and recommendations will update after service completion."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fffdf7] px-4 py-3 text-sm text-[#33453a] dark:border-[#506a54] dark:bg-[#21362b] dark:text-[#d9ccb2]">
                      Treatment zones: exterior perimeter, entry thresholds, moisture-prone edges.
                    </div>
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fffdf7] px-4 py-3 text-sm text-[#33453a] dark:border-[#506a54] dark:bg-[#21362b] dark:text-[#d9ccb2]">
                      Safety guidance: keep pets and children away until the treated areas are fully dry.
                    </div>
                    <div className="rounded-2xl border border-[#ddd2b8] bg-[#fffdf7] px-4 py-3 text-sm text-[#33453a] dark:border-[#506a54] dark:bg-[#21362b] dark:text-[#d9ccb2]">
                      Coverage assurance: revisit recommended if new activity appears before next scheduled cycle.
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="font-semibold text-[#183126] dark:text-[#efe5cf]">Your first visit report will appear here once service is completed.</p>
              <p className="mt-2">After each appointment, we will show treatment outcomes, areas serviced, and recommended follow-up guidance.</p>
            </div>
          )}
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Readiness assurance" subtitle="Standards that keep field operations predictable">
          <div className="grid gap-3 md:grid-cols-3">
            {readinessAssurance.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4b6550] dark:bg-[#22372c]">
                <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{item.detail}</p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Protection Visits",
            pageSummary: `${homeIntelligence.summary} This page focuses on field readiness, scheduling, visit reports, and the property zones likely to need the most attention next.`,
            customerName: snapshot.customer.name,
            activePlan: humanize(snapshot.customer.activePlan),
            lifecycle: humanize(snapshot.customer.lifecycle),
            city: snapshot.customer.city,
            lastServiceDate: snapshot.customer.lastServiceDate ? formatDate(snapshot.customer.lastServiceDate) : "No visit logged yet",
            propertyAddress: [snapshot.customer.addressLine1, snapshot.customer.city].filter(Boolean).join(", "),
          }}
        />
      </section>
    </AccountShell>
  );
}
