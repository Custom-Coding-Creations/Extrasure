"use client";

import { useState } from "react";

interface ExportStats {
  totalAssessments: number;
  dateRange: { earliest: string | null; latest: string | null };
  averageConfidence: number;
  severityBreakdown: Record<string, number>;
  urgencyBreakdown: Record<string, number>;
}

export function TriageAssessmentExportCard() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minConfidence, setMinConfidence] = useState(0);
  const [maxConfidence, setMaxConfidence] = useState(100);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("action", "stats");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (minConfidence > 0) params.set("minConfidence", (minConfidence / 100).toString());
      if (maxConfidence < 100) params.set("maxConfidence", (maxConfidence / 100).toString());

      const response = await fetch(`/api/admin/triage-export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load export stats");
      }

      const data = (await response.json()) as { ok: boolean; stats: ExportStats };
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const filters: Record<string, string | number> = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (minConfidence > 0) filters.minConfidence = minConfidence / 100;
      if (maxConfidence < 100) filters.maxConfidence = maxConfidence / 100;

      const response = await fetch("/api/admin/triage-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, filters }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `triage-assessments-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Assessment Export</h2>
          <p className="mt-1 text-sm text-[#445349]">Download triage assessment data for analysis</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[#f8d7da] bg-[#f8d7da] p-3 text-sm text-[#8a3d22]">{error}</div>
      )}

      <div className="mt-6 space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#5d7267]">Export Format</label>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                format === "csv"
                  ? "border-[#1b2f25] bg-[#1b2f25] text-[#fff9eb]"
                  : "border-[#cbbd9f] bg-[#fffdf6] text-[#1b2f25] hover:bg-[#f5ede0]"
              }`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                format === "json"
                  ? "border-[#1b2f25] bg-[#1b2f25] text-[#fff9eb]"
                  : "border-[#cbbd9f] bg-[#fffdf6] text-[#1b2f25] hover:bg-[#f5ede0]"
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="start-date" className="block text-xs font-semibold text-[#5d7267]">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25]"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-xs font-semibold text-[#5d7267]">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25]"
            />
          </div>
        </div>

        {/* Confidence Range */}
        <div>
          <label className="block text-xs font-semibold text-[#5d7267]">
            Confidence Range: {minConfidence}% - {maxConfidence}%
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Math.min(parseInt(e.target.value), maxConfidence))}
              className="flex-1"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={maxConfidence}
              onChange={(e) => setMaxConfidence(Math.max(parseInt(e.target.value), minConfidence))}
              className="flex-1"
            />
          </div>
        </div>

        {/* Preview Stats */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadStats}
            disabled={loadingStats}
            className="rounded-lg border border-[#1b2f25] bg-[#fffdf6] px-4 py-2 text-sm font-semibold text-[#1b2f25] hover:bg-[#f5ede0] disabled:bg-[#d3c7ad] disabled:text-[#8a8580]"
          >
            {loadingStats ? "Loading..." : "Preview"}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] hover:bg-[#142420] disabled:bg-[#d3c7ad] disabled:text-[#8a8580]"
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>

        {/* Stats Display */}
        {stats && (
          <div className="mt-4 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
            <p className="text-sm font-semibold text-[#1b2f25]">Export Preview</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-[#5d7267]">Total Assessments</p>
                <p className="text-2xl font-bold text-[#20372c]">{stats.totalAssessments.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-[#5d7267]">Average Confidence</p>
                <p className="text-2xl font-bold text-[#20372c]">{Math.round(stats.averageConfidence * 100)}%</p>
              </div>
            </div>

            {stats.dateRange.earliest && stats.dateRange.latest && (
              <div className="mt-3">
                <p className="text-xs text-[#5d7267]">Date Range</p>
                <p className="text-sm text-[#445349]">
                  {new Date(stats.dateRange.earliest).toLocaleDateString()} -{" "}
                  {new Date(stats.dateRange.latest).toLocaleDateString()}
                </p>
              </div>
            )}

            {Object.keys(stats.severityBreakdown).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[#5d7267]">Severity Breakdown</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(stats.severityBreakdown).map(([severity, count]) => (
                    <span key={severity} className="rounded-full bg-[#f5ede0] px-3 py-1 text-xs text-[#1b2f25]">
                      {severity}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
