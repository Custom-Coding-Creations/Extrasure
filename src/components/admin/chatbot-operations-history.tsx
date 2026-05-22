"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ChatbotOperationAction =
  | "list_appointments"
  | "list_technicians"
  | "get_availability"
  | "schedule_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "assign_technician";

type OperationHistoryStatus = "success" | "error" | "requires_confirmation";
type OperationHistoryStatusFilter = "all" | OperationHistoryStatus;

type OperationHistoryEntry = {
  id: string;
  createdAt: string;
  action: ChatbotOperationAction;
  status: OperationHistoryStatus;
  message: string;
  source?: "audit" | "live";
  auditAction?: string;
  actor?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

type OperationHistoryApiResponse = {
  ok: boolean;
  entries?: OperationHistoryEntry[];
  capabilities?: {
    canViewAllScope: boolean;
    viewerRole?: string;
  };
};

export function ChatbotOperationsHistory() {
  const [entries, setEntries] = useState<OperationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"self" | "all">("self");
  const [statusFilter, setStatusFilter] = useState<OperationHistoryStatusFilter>("all");
  const [canViewAllScope, setCanViewAllScope] = useState(false);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/ai/chat/operations-history?limit=50&scope=${scope}`, {
        method: "GET",
      });

      if (response.status === 403) {
        setCanViewAllScope(false);
        setScope("self");
        setError("Team-wide history requires owner role.");
        setEntries([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load operation history.");
      }

      const payload = (await response.json()) as OperationHistoryApiResponse;
      if (!payload.ok || !Array.isArray(payload.entries)) {
        throw new Error("Unexpected history response.");
      }

      setEntries(payload.entries);
      setCanViewAllScope(Boolean(payload.capabilities?.canViewAllScope));
      setViewerRole(typeof payload.capabilities?.viewerRole === "string" ? payload.capabilities.viewerRole : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load operation history.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") {
      return entries;
    }
    return entries.filter((entry) => entry.status === statusFilter);
  }, [entries, statusFilter]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [filteredEntries, selectedEntryId],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c8a4] bg-[#fff7e8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Operations History</p>
            <h2 className="mt-1 text-xl text-[#15281f]">Recent operation activity</h2>
            <p className="mt-1 text-sm text-[#3c4e43]">
              Review confirmed actions, denied actions, and outcomes from the Operations Console.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="rounded-full border border-[#d6c39c] bg-[#fdf2dd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#5f4b22]">
              Role: {viewerRole ?? "unknown"}
            </p>
            <button
              type="button"
              onClick={() => void loadEntries()}
              disabled={loading}
              className="rounded-md border border-[#ccb68b] bg-[#f8e7c4] px-2 py-1 text-xs font-semibold text-[#5d4a24] hover:bg-[#f2dbad] disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 rounded-md border border-[#d9a39b] bg-[#feeceb] px-3 py-2 text-sm text-[#7d2b20]">{error}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              statusFilter === "all" ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]" : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("success")}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              statusFilter === "success" ? "border-[#95bca0] bg-[#e8f6eb] text-[#1f5d35]" : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
            }`}
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("error")}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              statusFilter === "error" ? "border-[#d8a9a2] bg-[#fcebe8] text-[#7b2f24]" : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
            }`}
          >
            Errors
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("requires_confirmation")}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              statusFilter === "requires_confirmation"
                ? "border-[#d7bf8a] bg-[#fbf1dd] text-[#6a4f1f]"
                : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
            }`}
          >
            Needs confirmation
          </button>

          {canViewAllScope ? (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScope("self")}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  scope === "self" ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]" : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                }`}
              >
                My activity
              </button>
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  scope === "all" ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]" : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                }`}
              >
                Team activity
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4">
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-[#5c6c61]">No operations found for this filter.</p>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-[#dfd4be] bg-[#fff8ea] p-3 text-sm text-[#2e4136]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {entry.action} ({entry.status})
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedEntryId(entry.id)}
                    className="rounded-md border border-[#ccb68b] bg-[#f8e7c4] px-2 py-1 text-xs font-semibold text-[#5d4a24] hover:bg-[#f2dbad]"
                  >
                    Details
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#5c6c61]">{entry.message}</p>
                <p className="mt-1 text-[11px] text-[#6b7c70]">{new Date(entry.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedEntry ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <section className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.35)]">
            <header className="flex items-center justify-between border-b border-[#dcc8a5] bg-[#fff2d8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#3f3524]">Operation Details</p>
                <p className="text-xs text-[#6a5b3b]">
                  {selectedEntry.action} ({selectedEntry.status})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntryId(null)}
                className="rounded-md border border-[#c8b48e] px-2 py-1 text-xs font-semibold text-[#4f4227]"
              >
                Close
              </button>
            </header>
            <div className="space-y-2 overflow-y-auto p-4 text-xs text-[#4c432f]">
              <p>
                <span className="font-semibold">Created:</span> {selectedEntry.createdAt}
              </p>
              <p>
                <span className="font-semibold">Message:</span> {selectedEntry.message}
              </p>
              {selectedEntry.actor ? (
                <p>
                  <span className="font-semibold">Actor:</span> {selectedEntry.actor}
                </p>
              ) : null}
              {selectedEntry.entityId ? (
                <p>
                  <span className="font-semibold">Chat Session:</span> {selectedEntry.entityId}
                </p>
              ) : null}
              <div>
                <p className="font-semibold">Payload</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                  {JSON.stringify(selectedEntry.payload ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold">Result</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                  {JSON.stringify(selectedEntry.result ?? {}, null, 2)}
                </pre>
              </div>
              {selectedEntry.before || selectedEntry.after ? (
                <div>
                  <p className="font-semibold">Before / After</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                    {JSON.stringify({ before: selectedEntry.before ?? null, after: selectedEntry.after ?? null }, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
