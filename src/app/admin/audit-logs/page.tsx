import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminRole } from "@/lib/admin-auth";
import { getAuditEvents, parseAuditSnapshot } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminAuditLogsPage() {
  await requireAdminRole(["owner"]);

  const events = await getAuditEvents(undefined, 200);

  const entityColors: Record<string, string> = {
    customer: "bg-blue-100 text-blue-800",
    job: "bg-purple-100 text-purple-800",
    invoice: "bg-green-100 text-green-800",
    estimate: "bg-yellow-100 text-yellow-800",
    inventory: "bg-orange-100 text-orange-800",
    automation: "bg-pink-100 text-pink-800",
    admin_user: "bg-red-100 text-red-800",
    technician: "bg-indigo-100 text-indigo-800",
    payment: "bg-emerald-100 text-emerald-800",
  };

  return (
    <AdminShell
      title="Audit Log"
      subtitle="Immutable record of all sensitive actions across the dashboard. Owner-only access."
    >
      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity ID</th>
              <th className="px-4 py-3">Before</th>
              <th className="px-4 py-3">After</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const entityKey = event.entity.toLowerCase();
              const colorClass = entityColors[entityKey] || "bg-gray-100 text-gray-800";

              return (
                <tr key={event.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 text-xs text-[#5d7267]">{formatTimestamp(event.timestamp)}</td>
                  <td className="px-4 py-3 font-semibold text-[#1b2f25]">{event.actor}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{event.role}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>{event.entity}</span>
                  </td>
                  <td className="px-4 py-3 text-[#33453a]">{event.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#5d7267]">{event.entityId}</td>
                  <td className="px-4 py-3">
                    {event.before ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-[#445349] hover:underline">view</summary>
                        <pre className="mt-2 overflow-auto rounded bg-[#f4e7cb] p-2 text-xs">{JSON.stringify(parseAuditSnapshot(event.before), null, 2)}</pre>
                      </details>
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {event.after ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-[#445349] hover:underline">view</summary>
                        <pre className="mt-2 overflow-auto rounded bg-[#f4e7cb] p-2 text-xs">{JSON.stringify(parseAuditSnapshot(event.after), null, 2)}</pre>
                      </details>
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <p className="mt-4 text-center text-sm text-[#5d7267]">No audit events recorded yet.</p>
      )}

      <section className="mt-5 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-lg text-[#1b2f25]">Audit Log Policy</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          <li>All sensitive actions are recorded immutably with actor, role, entity, and before/after snapshots.</li>
          <li>Audit events are retained indefinitely for compliance and investigation.</li>
          <li>This log is owner-only and not exposed in standard navigation for security.</li>
          <li>Access to this log should be reviewed as part of regular security audits.</li>
        </ul>
      </section>
    </AdminShell>
  );
}
