"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  after: {
    action: "dry_run" | "execute";
    dryRun: boolean;
    deletedBlobCount: number;
    deletedRecordCount: number;
    matchedPhotoAssessmentCount: number;
  } | null;
};

export function TriageRetentionHistoryCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch("/api/admin/audit-events?action=triage_retention_run&limit=20");

        if (!response.ok) {
          throw new Error(`Failed to load audit events: ${response.statusText}`);
        }

        const data = (await response.json()) as { events: AuditEvent[] };
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Retention Run History</h2>
        <p className="mt-4 text-sm text-[#5d7267]">Loading history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Retention Run History</h2>
        <p className="mt-4 text-sm text-[#8a3d22]">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <h2 className="text-2xl text-[#1b2f25]">Triage Retention Run History</h2>
      <p className="mt-2 text-sm text-[#445349]">Recent triage retention operations executed from this console.</p>

      {events.length === 0 ? (
        <p className="mt-4 text-sm text-[#5d7267]">No retention runs recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#cbbd9f] bg-[#f5ede0]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[#20372c]">Timestamp</th>
                <th className="px-3 py-2 text-left font-semibold text-[#20372c]">Actor</th>
                <th className="px-3 py-2 text-left font-semibold text-[#20372c]">Type</th>
                <th className="px-3 py-2 text-right font-semibold text-[#20372c]">Blobs Deleted</th>
                <th className="px-3 py-2 text-right font-semibold text-[#20372c]">Records Deleted</th>
                <th className="px-3 py-2 text-center font-semibold text-[#20372c]">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const isExpanded = expandedId === event.id;
                const after = event.after as unknown as AuditEvent["after"];

                return (
                  <tr key={event.id} className="border-b border-[#e5d9c3] hover:bg-[#fffcf0]">
                    <td className="px-3 py-2 text-[#445349]">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[#20372c]">{event.actor}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          after?.dryRun
                            ? "bg-[#d4e8e8] text-[#1b5a56]"
                            : "bg-[#f8d7da] text-[#8a3d22]"
                        }`}
                      >
                        {after?.dryRun ? "Dry-run" : "Execute"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[#445349]">{after?.deletedBlobCount ?? 0}</td>
                    <td className="px-3 py-2 text-right text-[#445349]">{after?.deletedRecordCount ?? 0}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {expandedId &&
            events.find((e) => e.id === expandedId) && (
              <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
                <p className="font-semibold text-[#20372c]">Execution Details</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-[#fffdf6] p-2 text-xs text-[#1d2f25]">
                  {JSON.stringify(
                    events.find((e) => e.id === expandedId)?.after,
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
        </div>
      )}
    </section>
  );
}
