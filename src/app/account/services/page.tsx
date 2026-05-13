import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AssuranceRibbon, DashboardCard, SignalMeter, StatKpi, StatusBadge, TimelinePanel } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { buildServicesDashboardMetrics } from "@/lib/account-dashboard-metrics";
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
  const shellState = await buildAccountShellState(snapshot, "services");

  let nextVisitTone: "success" | "warning" | "danger" | "info" = "info";
  let nextVisitDateLabel = "";
  let nextVisitTitle = "Scheduled protection visit";
  let nextVisitDetail = "";

  if (nextVisit) {
    if ("service" in nextVisit) {
      nextVisitTone = jobTone(nextVisit.status);
      nextVisitDateLabel = formatDateTime(nextVisit.scheduledAt);
      nextVisitTitle = nextVisit.service;
      nextVisitDetail = `Technician route scheduled for ${formatDateTime(nextVisit.scheduledAt)}`;
    } else {
      nextVisitTone = bookingTone(nextVisit.status);
      nextVisitDateLabel = formatDate(nextVisit.preferredDate);
      nextVisitDetail = `${nextVisit.preferredWindow} at ${nextVisit.addressLine1}, ${nextVisit.city}`;
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
      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <DashboardCard
          title="Next Protection Window"
          subtitle="Your next visit, preparation expectations, and service readiness"
          ctaHref="/contact"
          ctaLabel="Request Service"
        >
          {nextVisit ? (
            <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-[#d8ccaf] bg-[#fffcf4] p-5 dark:border-[#4d6751] dark:bg-[#1f3328]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge
                    tone={nextVisitTone}
                    label={humanize(nextVisit.status)}
                  />
                  <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e7d1]">
                    {nextVisitDateLabel}
                  </p>
                </div>
                <p className="mt-4 text-2xl text-[#152e24] dark:text-[#f2e8d3]">
                  {nextVisitTitle}
                </p>
                <p className="mt-2 text-sm text-[#42594a] dark:text-[#d6c9ad]">
                  {nextVisitDetail}
                </p>
                <div className="mt-4 rounded-2xl border border-[#dccfb5] bg-[#fff7e7] px-4 py-3 text-sm text-[#31483b] dark:border-[#4f6953] dark:bg-[#243a2e] dark:text-[#d8ccb2]">
                  Preparation checklist: secure pets, clear gate access, and note any new pest activity before arrival.
                </div>
              </div>
              <div className="grid gap-3">
                <StatKpi
                  label="Upcoming bookings"
                  value={String(upcomingBookings.length)}
                  detail="Pending and confirmed visit requests"
                />
                <StatKpi
                  label="Completed visits"
                  value={String(completedVisitsCount)}
                  detail="Recorded protection outcomes"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="font-semibold text-[#183126] dark:text-[#efe5cf]">No visit is currently on the calendar.</p>
              <p className="mt-2">Book a protection visit to maintain your service cadence and keep your protection score strong.</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Visit Readiness" subtitle="Operational transparency for every scheduled stop">
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
      </section>

      <section className="mt-4">
        <DashboardCard title="Visit Timeline" subtitle="Upcoming service checkpoints and queue status">
          {timelineEvents.length ? (
            <TimelinePanel events={timelineEvents} />
          ) : (
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              Service timeline checkpoints will appear once your next visit is queued.
            </div>
          )}
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
        <DashboardCard title="Readiness Assurance" subtitle="Standards that keep field operations predictable">
          <AssuranceRibbon items={readinessAssurance} />
        </DashboardCard>
      </section>

      <section className="mt-4">
        <AccountAiAssistantCard
          context={{
            currentPage: "Protection Visits",
            pageSummary: "Upcoming booking requests, visit readiness, service history, and visit reports.",
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
