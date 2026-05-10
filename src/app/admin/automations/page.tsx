import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  createAutomationAction,
  deleteAutomationAction,
  markAutomationFailedAction,
  markAutomationQueuedAction,
  markAutomationSentAction,
  updateAutomationAction,
} from "@/app/admin/automations/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="Automation Center"
      subtitle="Review system-triggered alerts, reminders, retries, and follow-up workflows that protect conversion and retention."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Queue Automation</h2>
        <form action={createAutomationAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="type" defaultValue="lead_alert" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="lead_alert">Lead Alert</option>
            <option value="appointment_reminder">Appointment Reminder</option>
            <option value="invoice_reminder">Invoice Reminder</option>
            <option value="failed_payment_retry">Failed Payment Retry</option>
            <option value="review_request">Review Request</option>
            <option value="seasonal_reservice">Seasonal Reservice</option>
          </select>
          <input name="target" required placeholder="Target" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="scheduledFor" type="datetime-local" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <select name="status" defaultValue="queued" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create event</button>
        </form>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled For</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.automationEvents.map((event) => {
              const formId = `automation-form-${event.id}`;

              return (
              <tr key={event.id} className="border-b border-[#ecdfc3] last:border-0">
                <td className="px-4 py-3 align-top font-semibold text-[#1b2f25]">
                  <input form={formId} name="type" defaultValue={event.type} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <input form={formId} name="target" defaultValue={event.target} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <select form={formId} name="status" defaultValue={event.status} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                    <option value="queued">Queued</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                  </select>
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <input form={formId} name="scheduledFor" type="datetime-local" defaultValue={event.scheduledFor.slice(0, 16)} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <form id={formId} action={updateAutomationAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                    </form>
                    <form action={deleteAutomationAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                    </form>
                    <form action={markAutomationQueuedAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="rounded-full border border-[#30435b] px-3 py-1 text-xs font-semibold text-[#30435b] transition hover:bg-[#30435b] hover:text-white">Queue</button>
                    </form>
                    <form action={markAutomationSentAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="rounded-full border border-[#2e5a46] px-3 py-1 text-xs font-semibold text-[#2e5a46] transition hover:bg-[#2e5a46] hover:text-white">Mark Sent</button>
                    </form>
                    <form action={markAutomationFailedAction}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="rounded-full border border-[#6b4d2d] px-3 py-1 text-xs font-semibold text-[#6b4d2d] transition hover:bg-[#6b4d2d] hover:text-white">Mark Failed</button>
                    </form>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </AdminShell>
  );
}
