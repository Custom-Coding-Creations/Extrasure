"use client";

import { FormEvent, useState } from "react";
import { useChatbot } from "./chatbot-provider";

export function TriageForm() {
  const {
    triageSymptom,
    setTriageSymptom,
    triagePhotos,
    setTriagePhotos,
    triageLoading,
    triageError,
    triageResult,
    triageHumanReviewNotice,
    submitTriage,
  } = useChatbot();

  const [uploadError, setUploadError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitTriage(triageSymptom, triagePhotos);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadError("");

    try {
      const formData = new FormData();
      Array.from(files).slice(0, 4).forEach((file) => {
        formData.append("photos", file);
      });

      const response = await fetch("/api/ai/triage/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const urls = (data.urls as string[]) || [];
      setTriagePhotos(urls.slice(0, 4));
    } catch {
      setUploadError("Photo upload failed. Ensure you are signed in and files are valid images.");
    }
  }

  return (
    <form className="mt-3 space-y-2 rounded-xl border border-[#d9c8a8] bg-[#fff4de] p-3" onSubmit={handleSubmit}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3e5348]">AI Pest Triage</p>
      <textarea
        className="field min-h-20"
        value={triageSymptom}
        onChange={(event) => setTriageSymptom(event.target.value)}
        placeholder="Describe signs, locations, and timing (for example: droppings in kitchen at night)."
        aria-label="Triage symptom summary"
        required
      />
      <input
        type="file"
        accept="image/*"
        multiple
        className="field"
        onChange={(event) => void handlePhotoUpload(event.target.files)}
        aria-label="Upload pest photos"
      />
      {triagePhotos.length > 0 && <p className="text-xs text-[#4b604f]">Uploaded photos: {triagePhotos.length}</p>}
      {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
      <button
        type="submit"
        disabled={triageLoading}
        className="w-full rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {triageLoading ? "Analyzing..." : "Analyze symptoms"}
      </button>
      {triageError && <p className="text-xs text-red-700">{triageError}</p>}
      {triageHumanReviewNotice && <p className="text-xs font-semibold text-[#6e3f13]">{triageHumanReviewNotice}</p>}
      {triageResult && (
        <article className="rounded-xl border border-[#d9c8a8] bg-[#fff9ef] p-3 text-xs text-[#2d4135]">
          <p><strong>Likely pest:</strong> {triageResult.likelyPest}</p>
          <p className="mt-1"><strong>Confidence:</strong> {Math.round(triageResult.confidence * 100)}%</p>
          <p className="mt-1"><strong>Urgency:</strong> {triageResult.urgency}</p>
          <p className="mt-1"><strong>Recommendation:</strong> {triageResult.recommendedService}</p>
          <p className="mt-1"><strong>Timeline:</strong> {triageResult.recommendedTimeline}</p>
          {triageHumanReviewNotice && (
            <p className="mt-2 text-[#6e3f13]">Please use call, text, or follow-up request for human confirmation.</p>
          )}
        </article>
      )}
    </form>
  );
}
