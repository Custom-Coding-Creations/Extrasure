"use client";

import { useEffect, useMemo, useState } from "react";

type ManualAssistantModeTimelinePoint = {
  hourStartIso: string;
  total: number;
  modeCounts: Record<string, number>;
};

type MetricsApiPayload = {
  ok: true;
  lookbackHours: number;
  totalResponses: number;
  modeCounts: Record<string, number>;
  timeline: ManualAssistantModeTimelinePoint[];
};

const LOOKBACK_OPTIONS = [24, 72, 168] as const;

function modeLabel(mode: string) {
  return mode
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatHourLabel(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(date);
}

export function AdminManualAssistantMetrics() {
  const [lookbackHours, setLookbackHours] = useState<number>(24);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [payload, setPayload] = useState<MetricsApiPayload | null>(null);

  useEffect(() => {
    let canceled = false;

    async function loadMetrics() {
      if (typeof fetch !== "function") {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/manual-assistant/metrics?lookbackHours=${lookbackHours}`);
        const body = (await response.json()) as MetricsApiPayload | { error?: string };

        if (!response.ok || !("ok" in body)) {
          throw new Error("error" in body && body.error ? body.error : `HTTP ${response.status}`);
        }

        if (!canceled) {
          setPayload(body);
        }
      } catch (loadError) {
        if (!canceled) {
          setPayload(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load metrics");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      canceled = true;
    };
  }, [lookbackHours]);

  const modeRows = useMemo(() => {
    const counts = payload?.modeCounts ?? {};
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [payload]);

  const highestCount = modeRows[0]?.[1] ?? 1;
  const nonZeroTimeline = (payload?.timeline ?? []).filter((point) => point.total > 0);

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6b61]">Assistant Performance Snapshot</p>
          <p className="mt-1 text-sm text-[#445349]">Monitor how often the manual assistant serves grounded answers vs clarifiers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOOKBACK_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLookbackHours(option)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                lookbackHours === option
                  ? "border-[#1b4b79] bg-[#1b4b79] text-white"
                  : "border-[#35506b] bg-[#f8f0e3] text-[#233d5a] hover:bg-[#233d5a] hover:text-white"
              }`}
            >
              {option}h
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="mt-3 text-sm text-[#566c60]">Loading assistant metrics...</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-[#e9b2a0] bg-[#fff0ea] p-3 text-sm text-[#8a3d22]">{error}</p> : null}

      {!loading && !error && payload ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">Responses</p>
              <p className="mt-1 text-xl font-semibold text-[#20372c]">{payload.totalResponses}</p>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">Top Mode</p>
              <p className="mt-1 text-sm font-semibold text-[#20372c]">{modeRows[0] ? modeLabel(modeRows[0][0]) : "No data"}</p>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">Hours</p>
              <p className="mt-1 text-xl font-semibold text-[#20372c]">{payload.lookbackHours}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">Mode Breakdown</p>
            {modeRows.length === 0 ? (
              <p className="mt-2 text-sm text-[#566c60]">No assistant responses yet for this window.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {modeRows.map(([mode, count]) => (
                  <li key={mode}>
                    <div className="flex items-center justify-between gap-3 text-sm text-[#445349]">
                      <span>{modeLabel(mode)}</span>
                      <span className="font-semibold text-[#20372c]">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#efe4ca]">
                      <div
                        className="h-2 rounded-full bg-[#1b4b79]"
                        style={{ width: `${Math.max(8, Math.round((count / highestCount) * 100))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">Recent Activity</p>
            {nonZeroTimeline.length === 0 ? (
              <p className="mt-2 text-sm text-[#566c60]">No recent activity in this lookback window.</p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {nonZeroTimeline.slice(-8).map((point) => (
                  <div key={point.hourStartIso} className="rounded-lg border border-[#e4d4b5] bg-[#fff9ed] px-3 py-2 text-xs text-[#445349]">
                    <p className="font-semibold text-[#20372c]">{formatHourLabel(point.hourStartIso)}</p>
                    <p className="mt-1">{point.total} responses</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
