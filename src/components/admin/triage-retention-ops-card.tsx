"use client";

import { useMemo, useState } from "react";

type RuntimeSnapshot = {
  triageEnabled: boolean;
  triageUiEnabled: boolean;
  humanReviewThreshold: number;
  photoRetentionDays: number;
  recordRetentionDays: number;
};

type RetentionResponse = {
  ok: true;
  dryRun: boolean;
  photoRetentionDays: number;
  recordRetentionDays: number;
  matchedPhotoAssessmentCount: number;
  matchedBlobUrlCount: number;
  deletedBlobCount: number;
  clearedPhotoReferenceCount: number;
  deletedRecordCount: number;
  runtime: RuntimeSnapshot;
};

export function TriageRetentionOpsCard() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RetentionResponse | null>(null);

  const runLabel = useMemo(() => {
    if (status === "loading") {
      return "Running...";
    }

    return "Run Dry-Run";
  }, [status]);

  const executeLabel = useMemo(() => {
    if (status === "loading") {
      return "Processing...";
    }

    return "Execute Purge";
  }, [status]);

  async function runRetention(action: "dry_run" | "execute") {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/triage-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as RetentionResponse | { error?: string };

      if (!response.ok || !("ok" in payload)) {
        setStatus("error");
        setResult(null);
        setMessage(payload && "error" in payload ? payload.error ?? "Retention operation failed." : "Retention operation failed.");
        return;
      }

      setResult(payload);
      setStatus("done");
      setMessage(action === "dry_run" ? "Dry-run completed." : "Retention purge executed.");
    } catch {
      setStatus("error");
      setResult(null);
      setMessage("Retention operation failed.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <h2 className="text-2xl text-[#1b2f25]">Triage Retention Operations</h2>
      <p className="mt-2 text-sm text-[#445349]">
        Run a safe dry-run or execute triage photo/record retention cleanup from the admin console.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runRetention("dry_run")}
          disabled={status === "loading"}
          className="rounded-full bg-[#163526] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm("Execute triage retention purge now? This can delete Blob photos and aged triage records.");

            if (confirmed) {
              void runRetention("execute");
            }
          }}
          disabled={status === "loading"}
          className="rounded-full border border-[#8a3d22] px-4 py-2 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {executeLabel}
        </button>
      </div>

      {message ? (
        <p className={`mt-3 text-xs font-semibold ${status === "error" ? "text-[#8a3d22]" : "text-[#2f4a3d]"}`}>
          {message}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-3 text-xs text-[#30433a]">
          <p className="font-semibold text-[#20372c]">Result snapshot</p>
          <p className="mt-1">Matched assessments with photos: {result.matchedPhotoAssessmentCount}</p>
          <p>Matched blob URLs: {result.matchedBlobUrlCount}</p>
          <p>Deleted blob URLs: {result.deletedBlobCount}</p>
          <p>Cleared photo references: {result.clearedPhotoReferenceCount}</p>
          <p>Deleted aged records: {result.deletedRecordCount}</p>
          <p className="mt-2">Runtime: triage API {result.runtime.triageEnabled ? "enabled" : "disabled"}, triage UI {result.runtime.triageUiEnabled ? "enabled" : "disabled"}</p>
          <p>
            Threshold {Math.round(result.runtime.humanReviewThreshold * 100)}%, photo retention {result.runtime.photoRetentionDays}d, record retention {result.runtime.recordRetentionDays}d
          </p>
        </div>
      ) : null}
    </section>
  );
}
