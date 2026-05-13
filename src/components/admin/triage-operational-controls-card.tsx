"use client";

import { useEffect, useState } from "react";

type OperationalState = {
  triageKillSwitchDisabled: boolean;
  triageHumanReviewThreshold: number;
  updatedAt: string;
  updatedBy: string | null;
};

export function TriageOperationalControlsCard() {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<OperationalState | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<number | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/operational-settings");

        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.statusText}`);
        }

        const data = (await response.json()) as { ok: true; settings: OperationalState };
        setSettings(data.settings);
        setThresholdDraft(data.settings.triageHumanReviewThreshold);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  async function toggleKillSwitch() {
    if (!settings) return;

    setToggling(true);
    setError(null);

    try {
      const action = settings.triageKillSwitchDisabled ? "enable" : "disable";
      const response = await fetch("/api/admin/operational-settings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle: ${response.statusText}`);
      }

      const data = (await response.json()) as { ok: true; settings: OperationalState };
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle kill switch");
    } finally {
      setToggling(false);
    }
  }

  async function applyThresholdChange() {
    if (thresholdDraft === null || !settings) return;

    setAdjusting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/operational-settings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "set_threshold", threshold: thresholdDraft }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update threshold: ${response.statusText}`);
      }

      const data = (await response.json()) as { ok: true; settings: OperationalState };
      setSettings(data.settings);
      setThresholdDraft(data.settings.triageHumanReviewThreshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update threshold");
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Operational Controls</h2>
        <p className="mt-4 text-sm text-[#5d7267]">Loading operational state...</p>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Triage Operational Controls</h2>
        <p className="mt-4 text-sm text-[#8a3d22]">{error || "Failed to load operational state"}</p>
      </section>
    );
  }

  const isDisabled = settings.triageKillSwitchDisabled;
  const currentThreshold = Math.round(settings.triageHumanReviewThreshold * 100);
  const draftThreshold = thresholdDraft !== null ? Math.round(thresholdDraft * 100) : currentThreshold;
  const hasThresholdChange = thresholdDraft !== settings.triageHumanReviewThreshold;

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <h2 className="text-2xl text-[#1b2f25]">Triage Operational Controls</h2>
      <p className="mt-2 text-sm text-[#445349]">
        Manage triage system enable/disable state and confidence thresholds without redeployment.
      </p>

      <div className="mt-6 grid gap-6">
        <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-[#20372c]">Triage System Status</p>
              <p className="mt-1 text-sm text-[#445349]">
                {isDisabled ? "System is currently disabled (kill switch active)" : "System is currently enabled"}
              </p>
              {settings.updatedBy && (
                <p className="mt-2 text-xs text-[#5d7267]">
                  Last changed by {settings.updatedBy} at {new Date(settings.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isDisabled ? "bg-[#f8d7da] text-[#8a3d22]" : "bg-[#d4e8e8] text-[#1b5a56]"
              }`}
            >
              {isDisabled ? "Disabled" : "Enabled"}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void toggleKillSwitch()}
            disabled={toggling}
            className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isDisabled
                ? "bg-[#d4e8e8] text-[#1b5a56] hover:bg-[#c0dede] disabled:opacity-60"
                : "border border-[#8a3d22] text-[#8a3d22] hover:bg-[#8a3d22] hover:text-white disabled:opacity-60"
            }`}
          >
            {toggling ? "Updating..." : isDisabled ? "Enable Triage" : "Disable Triage (Kill Switch)"}
          </button>

          {error && <p className="mt-3 text-xs text-[#8a3d22]">{error}</p>}
        </div>

        <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
          <p className="font-semibold text-[#20372c]">Human Review Confidence Threshold</p>
          <p className="mt-2 text-sm text-[#445349]">
            Assessments with confidence below{" "}
            <span className="font-semibold text-[#20372c]">{draftThreshold}%</span> are flagged for human review.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draftThreshold}
              onChange={(e) => setThresholdDraft(Number(e.target.value) / 100)}
              disabled={adjusting}
              className="flex-1"
            />
            <span className="w-12 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-center text-sm font-semibold text-[#1d2f25]">
              {draftThreshold}%
            </span>
          </div>

          <p className="mt-3 text-xs text-[#5d7267]">
            Lower values = stricter review (more manual reviews). Higher values = more auto-approve. Default: 70%.
          </p>

          {hasThresholdChange && (
            <button
              type="button"
              onClick={() => void applyThresholdChange()}
              disabled={adjusting}
              className="mt-4 rounded-lg bg-[#163526] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:opacity-60"
            >
              {adjusting ? "Applying..." : "Apply Threshold"}
            </button>
          )}

          {!hasThresholdChange && settings.updatedBy && (
            <p className="mt-3 text-xs text-[#5d7267]">
              Last changed by {settings.updatedBy} at {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
