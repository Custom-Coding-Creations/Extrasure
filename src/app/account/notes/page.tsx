import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AssuranceRibbon, DashboardCard, PremiumEmptyState, SignalMeter, StatusBadge, TimelinePanel } from "@/components/account/protection-ui";
import { createCustomerNote, logoutCustomer } from "@/app/account/actions";
import { buildNotesDashboardMetrics } from "@/lib/account-dashboard-metrics";
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
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Support Composer" subtitle="Start with the question you need answered most right now">
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

        <DashboardCard title="Guidance Center" subtitle="The proactive help layer for your account">
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

      <section className="mt-4">
        <DashboardCard title="Support Timeline" subtitle="Most recent support milestones and context snapshots">
          {supportTimeline.length ? (
            <TimelinePanel events={supportTimeline} />
          ) : (
            <PremiumEmptyState
              eyebrow="Support Timeline"
              title="No support milestones yet."
              description="When conversations begin, key support checkpoints will appear in this condensed timeline."
              secondaryText="Use the composer above to start your first support thread."
            />
          )}
        </DashboardCard>
      </section>

      <section className="mt-4">
        <DashboardCard title="Support Assurance" subtitle="How response quality and continuity are maintained">
          <AssuranceRibbon items={supportAssurance} />
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
