import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountAiAssistantCard } from "@/components/account/account-ai-assistant-card";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import { DashboardCard, PremiumEmptyState, SignalMeter, StatusBadge } from "@/components/account/protection-ui";
import { createCustomerNote, logoutCustomer } from "@/app/account/actions";
import { buildNotesDashboardMetrics } from "@/lib/account-dashboard-metrics";
import { buildAccountHomeIntelligence, buildAccountTimelineFeed } from "@/lib/account-home-intelligence";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function noteTone(authorType: string) {
  return authorType === "customer" ? ("info" as const) : ("success" as const);
}

export default async function AccountNotesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }
  const { supportSignalScore, supportTimeline, supportAssurance } = buildNotesDashboardMetrics(snapshot);
  const homeIntelligence = buildAccountHomeIntelligence(snapshot);
  const timelineFeed = buildAccountTimelineFeed(snapshot);
  const supportFeed = {
    filters: timelineFeed.filters.filter((filter) => filter.id === "all" || filter.id === "support" || filter.id === "ai"),
    items: timelineFeed.items.filter((item) => item.category === "support" || item.category === "ai"),
  };
  const shellState = await buildAccountShellState(snapshot, "notes");

  return (
    <AccountShell
      title="Support & Guidance"
      subtitle="Get help with billing, appointments, or treatment questions and keep a clear record of every conversation."
      activePath="/account/notes"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="dashboard-atmosphere premium-card animated-entry overflow-hidden rounded-[2rem] p-6 sm:p-7">
          <div className="relative z-10 grid gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={supportSignalScore >= 80 ? "success" : supportSignalScore >= 60 ? "warning" : "info"} label="Support guidance" />
              <span className="rounded-full border border-[#d8caad] bg-[rgba(255,250,240,0.72)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#335043] dark:border-[#536d57] dark:bg-[rgba(35,55,44,0.74)] dark:text-[#e0d4bc]">
                Embedded help system
              </span>
            </div>
            <div>
              <h2 className="max-w-3xl text-3xl leading-tight text-[#152b21] dark:text-[#f3ead7] sm:text-4xl">Support is now framed as a guided protection workflow, not just a message inbox.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#365042] dark:text-[#d6caaf]">{homeIntelligence.summary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Support readiness</p>
                <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{supportSignalScore}</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Conversation depth and context quality improve the support experience.</p>
              </article>
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Visible threads</p>
                <p className="mt-2 text-3xl font-semibold text-[#193327] dark:text-[#f1e8d3]">{snapshot.notes.length}</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Customer-visible support exchanges and guidance notes.</p>
              </article>
              <article className="rounded-[1.55rem] border border-[#dbcdb1] bg-[rgba(255,252,246,0.82)] p-4 dark:border-[#4e6852] dark:bg-[rgba(29,46,37,0.86)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#677e71] dark:text-[#c8bca1]">Escalation path</p>
                <p className="mt-2 text-lg font-semibold text-[#193327] dark:text-[#f1e8d3]">Priority ready</p>
                <p className="mt-2 text-sm text-[#486153] dark:text-[#d1c4a8]">Urgent protection changes can be explained and escalated from the same surface.</p>
              </article>
            </div>
          </div>
        </section>

        <DashboardCard title="Guidance center" subtitle="The proactive help layer for your account">
          <div className="space-y-3">
            <SignalMeter
              label="Support readiness"
              value={supportSignalScore}
              tone={supportSignalScore >= 80 ? "success" : supportSignalScore >= 60 ? "warning" : "info"}
              summary="Readiness improves as conversation context accumulates and support history becomes richer."
            />
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffdf6] p-4 dark:border-[#4b6650] dark:bg-[#1f3328]">
              <StatusBadge tone="info" label="Billing guidance" />
              <p className="mt-3 text-sm text-[#33453a] dark:text-[#d8ccb2]">Need invoice or payment clarification? We can translate the latest charge into plain language and next steps.</p>
            </article>
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffdf6] p-4 dark:border-[#4b6650] dark:bg-[#1f3328]">
              <StatusBadge tone="success" label="Visit preparation" />
              <p className="mt-3 text-sm text-[#33453a] dark:text-[#d8ccb2]">Ask what to do before treatment, what areas will be serviced, and how to protect pets and family members during drying time.</p>
            </article>
            <article className="rounded-2xl border border-[#d8ccaf] bg-[#fffdf6] p-4 dark:border-[#4b6650] dark:bg-[#1f3328]">
              <StatusBadge tone="warning" label="Urgent changes" />
              <p className="mt-3 text-sm text-[#33453a] dark:text-[#d8ccb2]">If you notice new activity, include where it appeared, when it started, and any seasonal conditions that may have changed.</p>
            </article>
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Support composer" subtitle="Start with the question you need answered most right now">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 text-sm text-[#354d40] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#61776c] dark:text-[#cabda2]">AI-ready prompts</p>
              <ul className="mt-3 space-y-2">
                <li>Explain my latest charge and what it covered.</li>
                <li>Help me prepare for my next treatment visit.</li>
                <li>I noticed new pest activity. What should I do next?</li>
                <li>Can I adjust my appointment window or plan cadence?</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 text-sm text-[#354d40] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#61776c] dark:text-[#cabda2]">Response expectations</p>
              <ul className="mt-3 space-y-2">
                <li>Billing clarification and invoice context.</li>
                <li>Service follow-up guidance and scheduling help.</li>
                <li>Escalation support for urgent protection concerns.</li>
                <li>Clear next steps without technical or billing jargon.</li>
              </ul>
            </div>
          </div>

          <form action={createCustomerNote} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-[#1b3227] dark:text-[#efe6d1]" htmlFor="support-note-body">
              Tell us what you need help with
            </label>
            <textarea
              id="support-note-body"
              name="body"
              required
              rows={6}
              className="field min-h-36 resize-y"
              placeholder="Describe your question, concern, or what changed at your property. We will use this to guide the next best response."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[#647a6f] dark:text-[#cdbfa4]">
                Messages stay connected to your protection history for faster support.
              </p>
              <button
                type="submit"
                className="elevated-action rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
              >
                Send to Support
              </button>
            </div>
          </form>
        </DashboardCard>

        <AccountAiAssistantCard
          context={{
            currentPage: "Support & Guidance",
            pageSummary: `${homeIntelligence.summary} This page focuses on support requests, guided prompts, visible conversation history, and escalation context.`,
            customerName: snapshot.customer.name,
            activePlan: snapshot.customer.activePlan,
            lifecycle: snapshot.customer.lifecycle,
            city: snapshot.customer.city,
            lastServiceDate: snapshot.customer.lastServiceDate ? formatDateTime(snapshot.customer.lastServiceDate) : "No visit logged yet",
            propertyAddress: [snapshot.customer.addressLine1, snapshot.customer.city].filter(Boolean).join(", "),
          }}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard title="Support timeline" subtitle="Most recent support milestones and context snapshots">
          {supportFeed.items.length > 1 ? (
            <AccountHomeTimeline filters={supportFeed.filters} items={supportFeed.items} />
          ) : supportTimeline.length ? (
            <div className="grid gap-3">
              {supportTimeline.map((event) => (
                <article key={event.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
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
              eyebrow="Support Timeline"
              title="No support milestones yet."
              description="When conversations begin, key support checkpoints will appear in this condensed timeline."
              secondaryText="Use the composer above to start your first support thread."
            />
          )}
        </DashboardCard>

        <DashboardCard title="Support assurance" subtitle="How response quality and continuity are maintained">
          <div className="grid gap-3">
            {supportAssurance.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
                <p className="text-base font-semibold text-[#173126] dark:text-[#f1e8d4]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#3f5648] dark:text-[#d4c7ab]">{item.detail}</p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Conversation History" subtitle="Customer-visible support and service guidance">
          {snapshot.notes.length ? (
            <div className="space-y-3">
              {snapshot.notes.map((note) => (
                <article key={note.id} className="rounded-3xl border border-[#d8cbaf] bg-[#fffdf6] p-5 dark:border-[#4b6650] dark:bg-[#1f3328]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-[#1b2f25] dark:text-[#f0e6d1]">{note.authorName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#60766b] dark:text-[#c8bba0]">{formatDateTime(note.createdAt)}</p>
                    </div>
                    <StatusBadge tone={noteTone(note.authorType)} label={note.authorType === "customer" ? "You" : "Support"} />
                  </div>
                  <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] px-4 py-3 text-sm leading-relaxed text-[#33453a] dark:border-[#506a54] dark:bg-[#243a2f] dark:text-[#d8ccb2]">
                    {note.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <PremiumEmptyState
              eyebrow="Support & Guidance"
              title="No support conversations yet."
              description="When you send your first message, it will appear here along with customer-visible replies and guidance from the ExtraSure team."
              secondaryText="Use the composer above to ask about billing, treatment prep, plan changes, or new pest activity."
            />
          )}
        </DashboardCard>
      </section>
    </AccountShell>
  );
}
