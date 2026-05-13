"use client";

import { useEffect, useState } from "react";

interface AssessmentOverride {
  id: string;
  triageAssessmentId: string;
  previousConfidence: number;
  newConfidence: number;
  reason: string;
  notes?: string;
  overriddenBy: string;
  createdAt: string;
}

interface OverrideStats {
  totalOverrides: number;
  reasonBreakdown: Record<string, number>;
  averageConfidenceChange: number;
}

export function TriageAssessmentOverrideCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverrideStats | null>(null);
  const [overrides, setOverrides] = useState<AssessmentOverride[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [confidence, setConfidence] = useState(0.7);
  const [reason, setReason] = useState("incorrect_confidence");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, overridesRes] = await Promise.all([
          fetch("/api/admin/triage-assessment-override?action=stats&hoursBack=24"),
          fetch("/api/admin/triage-assessment-override?action=recent&limit=10"),
        ]);

        if (!statsRes.ok || !overridesRes.ok) {
          throw new Error("Failed to load override data");
        }

        const statsData = (await statsRes.json()) as { ok: boolean; stats: OverrideStats };
        const overridesData = (await overridesRes.json()) as { ok: boolean; overrides: AssessmentOverride[] };

        setStats(statsData.stats);
        setOverrides(overridesData.overrides);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load override data");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/admin/triage-assessment-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          newConfidence: confidence,
          reason,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to override assessment");
      }

      // Reset form and reload data
      setAssessmentId("");
      setConfidence(0.7);
      setReason("incorrect_confidence");
      setNotes("");
      setShowForm(false);

      // Reload stats and history
      const [statsRes, overridesRes] = await Promise.all([
        fetch("/api/admin/triage-assessment-override?action=stats&hoursBack=24"),
        fetch("/api/admin/triage-assessment-override?action=recent&limit=10"),
      ]);

      if (statsRes.ok && overridesRes.ok) {
        const statsData = (await statsRes.json()) as { ok: boolean; stats: OverrideStats };
        const overridesData = (await overridesRes.json()) as { ok: boolean; overrides: AssessmentOverride[] };
        setStats(statsData.stats);
        setOverrides(overridesData.overrides);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to override assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Assessment Override</h2>
        <p className="mt-4 text-sm text-[#5d7267]">Loading override data...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Assessment Override</h2>
        <p className="mt-4 text-sm text-[#8a3d22]">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Assessment Override</h2>
          <p className="mt-1 text-sm text-[#445349]">Manually adjust assessment decisions</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] hover:bg-[#142420]"
        >
          {showForm ? "Cancel" : "New Override"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          {submitError && (
            <div className="rounded-lg border border-[#f8d7da] bg-[#f8d7da] p-3 text-sm text-[#8a3d22]">{submitError}</div>
          )}

          <div>
            <label htmlFor="assessmentId" className="block text-xs font-semibold text-[#5d7267]">
              Assessment ID
            </label>
            <input
              id="assessmentId"
              type="text"
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              placeholder="e.g., triage_abc123..."
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25] placeholder-[#a8a6a0]"
            />
          </div>

          <div>
            <label htmlFor="confidence" className="block text-xs font-semibold text-[#5d7267]">
              New Confidence Score: {Math.round(confidence * 100)}%
            </label>
            <input
              id="confidence"
              type="range"
              min="0"
              max="100"
              value={Math.round(confidence * 100)}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10) / 100)}
              className="mt-1 w-full"
            />
          </div>

          <div>
            <label htmlFor="reason" className="block text-xs font-semibold text-[#5d7267]">
              Reason for Override
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25]"
            >
              <option value="incorrect_confidence">Incorrect Confidence Score</option>
              <option value="model_misclassification">Model Misclassification</option>
              <option value="edge_case">Edge Case</option>
              <option value="manual_review_required">Manual Review Required</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-semibold text-[#5d7267]">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context for this override..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25] placeholder-[#a8a6a0]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !assessmentId}
            className="w-full rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] hover:bg-[#142420] disabled:bg-[#d3c7ad] disabled:text-[#8a8580]"
          >
            {submitting ? "Submitting..." : "Apply Override"}
          </button>
        </form>
      )}

      {stats && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
            <p className="text-xs font-semibold text-[#5d7267]">Total Overrides (24h)</p>
            <p className="mt-1 text-3xl font-bold text-[#20372c]">{stats.totalOverrides}</p>
          </div>

          <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
            <p className="text-xs font-semibold text-[#5d7267]">Avg Confidence Change</p>
            <p className="mt-1 text-3xl font-bold text-[#20372c]">
              {Math.round(stats.averageConfidenceChange * 100)}%
            </p>
          </div>
        </div>
      )}

      {overrides.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setExpandedHistory(!expandedHistory)}
            className="text-sm font-semibold text-[#1b2f25] hover:underline"
          >
            {expandedHistory ? "Hide" : "Show"} Recent Overrides ({overrides.length})
          </button>

          {expandedHistory && (
            <div className="mt-3 space-y-2">
              {overrides.map((override) => (
                <div key={override.id} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold text-[#5d7267]">
                      {override.previousConfidence.toFixed(2)} → {override.newConfidence.toFixed(2)}
                    </p>
                    <span className="text-xs text-[#8a8580]">{override.reason.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#5d7267]">Assessment: {override.triageAssessmentId}</p>
                  {override.notes && <p className="mt-1 text-xs italic text-[#445349]">{override.notes}</p>}
                  <p className="mt-1 text-xs text-[#a8a6a0]">
                    By {override.overriddenBy} • {new Date(override.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {overrides.length === 0 && (
        <p className="mt-6 rounded-lg border border-[#d4e8e8] bg-[#e8f4f4] p-3 text-sm text-[#1b5a56]">
          No assessment overrides yet. Use the form above to manually adjust assessment confidence scores.
        </p>
      )}
    </section>
  );
}
