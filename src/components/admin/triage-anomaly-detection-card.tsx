"use client";

import { useEffect, useState } from "react";

type AnomalyDetection = {
  ok: true;
  hasAnomalies: boolean;
  anomalies: {
    type: string;
    severity: "warning" | "critical";
    message: string;
    value: number;
    threshold: number;
  }[];
  metrics: {
    totalAssessments: number;
    autoApprovedCount: number;
    humanReviewFlaggedCount: number;
    autoApproveRate: number;
    averageConfidence: number;
    assessmentsByConfidenceBucket: Record<string, number>;
    timeWindow: {
      startDate: string;
      endDate: string;
      hoursSpanned: number;
    };
  };
};

export function TriageAnomalyDetectionCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnomalyDetection | null>(null);
  const [expandedAnomalies, setExpandedAnomalies] = useState(false);

  useEffect(() => {
    async function loadAnomalies() {
      try {
        const response = await fetch("/api/admin/triage-anomaly-detection?hoursBack=24");

        if (!response.ok) {
          throw new Error(`Failed to load anomalies: ${response.statusText}`);
        }

        const result = (await response.json()) as AnomalyDetection;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load anomaly detection");
      } finally {
        setLoading(false);
      }
    }

    void loadAnomalies();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      void loadAnomalies();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Health &amp; Anomalies</h2>
        <p className="mt-4 text-sm text-[#5d7267]">Analyzing assessment patterns...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Health &amp; Anomalies</h2>
        <p className="mt-4 text-sm text-[#8a3d22]">{error}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const { metrics, hasAnomalies, anomalies } = data;
  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Triage Health &amp; Anomalies</h2>
          <p className="mt-1 text-sm text-[#445349]">Last 24 hours: {metrics.totalAssessments} assessments analyzed</p>
        </div>

        {hasAnomalies && (
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <div className="rounded-full bg-[#f8d7da] px-3 py-1 text-xs font-semibold text-[#8a3d22]">
                {criticalCount} critical
              </div>
            )}
            {warningCount > 0 && (
              <div className="rounded-full bg-[#fff3cd] px-3 py-1 text-xs font-semibold text-[#856404]">
                {warningCount} warning
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          <p className="text-xs font-semibold text-[#5d7267]">Auto-Approve Rate</p>
          <p className="mt-1 text-3xl font-bold text-[#20372c]">{Math.round(metrics.autoApproveRate * 100)}%</p>
          <p className="mt-1 text-xs text-[#445349]">
            {metrics.autoApprovedCount} auto-approved, {metrics.humanReviewFlaggedCount} flagged for review
          </p>
        </div>

        <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          <p className="text-xs font-semibold text-[#5d7267]">Average Confidence</p>
          <p className="mt-1 text-3xl font-bold text-[#20372c]">{Math.round(metrics.averageConfidence * 100)}%</p>
          <p className="mt-1 text-xs text-[#445349]">
            Model confidence score across all assessments
          </p>
        </div>

        <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          <p className="text-xs font-semibold text-[#5d7267]">Confidence Distribution</p>
          <div className="mt-2 space-y-1 text-xs">
            {Object.entries(metrics.assessmentsByConfidenceBucket).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center justify-between">
                <span className="text-[#445349]">{bucket}</span>
                <span className="font-semibold text-[#20372c]">
                  {count} ({count > 0 ? Math.round((count / metrics.totalAssessments) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          <p className="text-xs font-semibold text-[#5d7267]">Status</p>
          <div
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              hasAnomalies
                ? "bg-[#f8d7da] text-[#8a3d22]"
                : "bg-[#d4e8e8] text-[#1b5a56]"
            }`}
          >
            {hasAnomalies ? "Anomalies Detected" : "Healthy"}
          </div>
        </div>
      </div>

      {hasAnomalies && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setExpandedAnomalies(!expandedAnomalies)}
            className="text-sm font-semibold text-[#8a3d22] hover:underline"
          >
            {expandedAnomalies ? "Hide" : "Show"} Anomalies ({anomalies.length})
          </button>

          {expandedAnomalies && (
            <div className="mt-3 space-y-2">
              {anomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 ${
                    anomaly.severity === "critical"
                      ? "border border-[#f8d7da] bg-[#f8d7da] text-[#8a3d22]"
                      : "border border-[#fff3cd] bg-[#fff3cd] text-[#856404]"
                  }`}
                >
                  <p className="text-xs font-semibold">
                    {anomaly.severity === "critical" ? "🚨" : "⚠️"} {anomaly.type}
                  </p>
                  <p className="mt-1 text-sm">{anomaly.message}</p>
                  <p className="mt-1 text-xs">
                    Current: {anomaly.value}, Threshold: {anomaly.threshold}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasAnomalies && metrics.totalAssessments > 0 && (
        <p className="mt-6 rounded-lg border border-[#d4e8e8] bg-[#e8f4f4] p-3 text-sm text-[#1b5a56]">
          ✓ No anomalies detected. Triage system metrics are within expected ranges.
        </p>
      )}

      {metrics.totalAssessments === 0 && (
        <p className="mt-6 rounded-lg border border-[#cbbd9f] bg-[#f5ede0] p-3 text-sm text-[#445349]">
          No assessments in the last 24 hours. Anomaly detection will resume when assessments are available.
        </p>
      )}
    </section>
  );
}
