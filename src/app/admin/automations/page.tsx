import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminState } from "@/lib/admin-store";

export default async function AdminAutomationsPage() {
  const state = await getAdminState();

  return (
    <AdminShell
      title="Automation Center"
      subtitle="Review system-triggered alerts, reminders, retries, and follow-up workflows that protect conversion and retention."
    >
      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled For</th>
            </tr>
          </thead>
          <tbody>
            {state.automationEvents.map((event) => (
              <tr key={event.id} className="border-b border-[#ecdfc3] last:border-0">
                <td className="px-4 py-3 font-semibold text-[#1b2f25]">{event.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-[#33453a]">{event.target}</td>
                <td className="px-4 py-3 capitalize text-[#33453a]">{event.status}</td>
                <td className="px-4 py-3 text-[#33453a]">{new Date(event.scheduledFor).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
