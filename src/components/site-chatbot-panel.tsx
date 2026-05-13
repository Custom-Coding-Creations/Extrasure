"use client";

import { FormEvent, useMemo, useState } from "react";
import { trackEvent, trackTriageEvent } from "@/lib/analytics";
import type { BookingAiHandoff } from "@/lib/booking-assistant-handoff";
import { isTriageUiEnabled } from "@/lib/triage-runtime";

type ChatRole = "assistant" | "user";

type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ApiChatResponse = {
  ok: true;
  sessionId: string;
  answer: string;
  language: "en" | "es";
  confidence: "low" | "medium" | "high";
  escalateToHuman: boolean;
  suggestLeadCapture: boolean;
  handoff: {
    callHref: string;
    smsHref: string;
    contactPath: string;
  };
};

type SiteChatbotPanelProps = {
  onClose: () => void;
  handoff?: BookingAiHandoff | null;
};

type TriageApiResponse = {
  ok: true;
  persisted: boolean;
  assessmentId: string | null;
  needsFollowUp: boolean;
  requiresHumanReview: boolean;
  humanReviewReason: "critical_risk" | "low_confidence" | "safety_escalation" | null;
  humanReviewThreshold: number;
  triage: {
    likelyPest: string;
    confidence: number;
    severity: "low" | "moderate" | "high" | "critical";
    urgency: "monitor" | "soon" | "urgent" | "immediate";
    recommendedService: string;
    estimatedPriceRange: string;
    recommendedTimeline: string;
    safetyConsiderations: string[];
    followUpQuestions: string[];
    riskFactors: string[];
    conversionLikelihood: "low" | "medium" | "high";
  };
};

function makeId() {
  return crypto.randomUUID();
}

function initialGreeting() {
  return "Hi, I can answer ExtraSure service questions, suggest appointment windows, and help you request a follow-up in English or Spanish.";
}

export function SiteChatbotPanel({ onClose, handoff }: SiteChatbotPanelProps) {
  const triageEnabled = isTriageUiEnabled();
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content: initialGreeting(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [leadMessage, setLeadMessage] = useState("");
  const [showTriage, setShowTriage] = useState(false);
  const [triageSymptom, setTriageSymptom] = useState("");
  const [triagePhotos, setTriagePhotos] = useState<string[]>([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState("");
  const [triageResult, setTriageResult] = useState<TriageApiResponse["triage"] | null>(null);
  const [triageHumanReviewNotice, setTriageHumanReviewNotice] = useState("");
  const [handoffLinks, setHandoffLinks] = useState<ApiChatResponse["handoff"]>({
    callHref: "tel:+15169432318",
    smsHref: "sms:+15169432318",
    contactPath: "/contact",
  });

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function submitMessage(message: string) {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || sending) {
      return;
    }

    const userMessage: UiMessage = {
      id: makeId(),
      role: "user",
      content: normalizedMessage,
    };

    setInput("");
    setSending(true);
    setMessages((current) => [...current, userMessage]);
    trackEvent("ai_chat_message_sent", { source: "site_chatbot", lineageSource: "legacy_chat" });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: normalizedMessage,
          history,
          context: handoff?.context,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as ApiChatResponse;

      setSessionId(data.sessionId);
      setShowLeadForm(data.suggestLeadCapture || data.escalateToHuman);
      setHandoffLinks(data.handoff);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer,
        },
      ]);

      if (data.escalateToHuman) {
        trackEvent("ai_chat_escalation", { source: "site_chatbot", lineageSource: "legacy_chat" });
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content:
            "I could not process that right now. You can call or text our team for immediate support.",
        },
      ]);
      setShowLeadForm(true);
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  async function uploadTriagePhotos(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const formData = new FormData();
    const selected = Array.from(files).slice(0, 4);

    for (const file of selected) {
      formData.append("files", file);
    }

    const response = await fetch("/api/ai/triage/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("upload_failed");
    }

    const payload = (await response.json()) as {
      files?: Array<{ url: string }>;
    };

    const urls = payload.files?.map((item) => item.url).filter(Boolean) ?? [];
    setTriagePhotos(urls.slice(0, 4));
  }

  async function submitTriage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = triageSymptom.trim();

    if (!message) {
      setTriageError("Share a short symptom summary to run triage.");
      return;
    }

    setTriageError("");
    setTriageLoading(true);
    trackTriageEvent("started", {
      lineageSource: "triage_engine",
      completionQualityScore: 0,
    });

    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          photoUrls: triagePhotos,
          answers: [
            {
              question: "Chatbot triage symptom summary",
              answer: message,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("triage_failed");
      }

      const payload = (await response.json()) as TriageApiResponse;
      setTriageResult(payload.triage);
      setShowLeadForm(payload.needsFollowUp || showLeadForm);
      setTriageHumanReviewNotice(
        payload.requiresHumanReview
          ? payload.humanReviewReason === "low_confidence"
            ? `Confidence is below ${Math.round(payload.humanReviewThreshold * 100)}%. A licensed team member should confirm next steps.`
            : "This triage result should be reviewed by our licensed team before final treatment decisions."
          : "",
      );
      trackTriageEvent("completed", {
        lineageSource: "triage_engine",
        completionQualityScore: payload.triage.confidence,
        userConfidenceSelection: payload.triage.confidence >= 0.75 ? "high" : payload.triage.confidence >= 0.55 ? "medium" : "low",
        followUpAccepted: payload.needsFollowUp,
      });
    } catch {
      setTriageError("Triage is unavailable right now. You can still continue with call, text, or quick follow-up.");
      setTriageHumanReviewNotice("");
      trackTriageEvent("failed", {
        lineageSource: "triage_engine",
      });
    } finally {
      setTriageLoading(false);
    }
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const payload = {
      source: `ai_chatbot_widget:${sessionId || "new"}`,
      fullName: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      addressOrZip: String(formData.get("addressOrZip") ?? "").trim(),
      serviceNeeded: String(formData.get("serviceNeeded") ?? "").trim(),
      details: [
        String(formData.get("pestType") ?? "").trim(),
        String(formData.get("propertyType") ?? "").trim(),
        String(formData.get("urgency") ?? "").trim(),
        String(formData.get("details") ?? "").trim(),
      ]
        .filter((value) => value.length > 0)
        .join(" | "),
    };

    setLeadStatus("submitting");
    setLeadMessage("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Lead capture failed");
      }

      setLeadStatus("success");
      setLeadMessage("Thanks. Our team will contact you shortly to confirm next steps.");
      trackEvent("ai_chat_lead_submit_success", { source: "site_chatbot", lineageSource: "legacy_chat" });
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setLeadStatus("error");
      setLeadMessage("Could not submit your details. Please call us for faster help.");
      trackEvent("ai_chat_lead_submit_error", { source: "site_chatbot", lineageSource: "legacy_chat" });
    }
  }

  return (
    <section className="w-[min(94vw,24rem)] overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.25)]">
      <header className="flex items-center justify-between bg-[#163526] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">ExtraSure AI Assistant</p>
          <p className="text-[11px] text-[#d8eadf]">Answers, estimates, and fast human handoff</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[#c8ddcf] px-2 py-1 text-xs text-[#ecf7f0]"
        >
          Close
        </button>
      </header>

      <div className="max-h-80 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite" aria-label="Chat conversation">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-xl px-3 py-2 text-sm leading-6 ${
              message.role === "assistant"
                ? "border border-[#d9c8a8] bg-[#fff3dc] text-[#253a2f]"
                : "ml-8 bg-[#1f3f2f] text-[#f4fff8]"
            }`}
          >
            {message.content}
          </article>
        ))}
      </div>

      <div className="border-t border-[#dbc9a9] bg-[#fffdf6] p-3">
        <form className="flex items-center gap-2" onSubmit={sendMessage}>
          <input
            className="field flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about pests, pricing range, or scheduling"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a
            href={handoffLinks.callHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "call" })}
          >
            Call Team
          </a>
          <a
            href={handoffLinks.smsHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "sms" })}
          >
            Text Team
          </a>
          <a
            href={handoffLinks.contactPath}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "web" })}
          >
            Contact Form
          </a>
          {triageEnabled ? (
            <button
              type="button"
              onClick={() => setShowTriage((current) => !current)}
              className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            >
              {showTriage ? "Hide triage" : "Start AI pest triage"}
            </button>
          ) : null}
        </div>

        {triageEnabled && showTriage ? (
          <form className="mt-3 space-y-2 rounded-xl border border-[#d9c8a8] bg-[#fff4de] p-3" onSubmit={submitTriage}>
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
              onChange={(event) => {
                void uploadTriagePhotos(event.target.files).catch(() => {
                  setTriageError("Photo upload failed. Ensure you are signed in and files are valid images.");
                });
              }}
              aria-label="Upload pest photos"
            />
            {triagePhotos.length ? <p className="text-xs text-[#4b604f]">Uploaded photos: {triagePhotos.length}</p> : null}
            <button
              type="submit"
              disabled={triageLoading}
              className="w-full rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {triageLoading ? "Analyzing..." : "Analyze symptoms"}
            </button>
            {triageError ? <p className="text-xs text-red-700">{triageError}</p> : null}
            {triageHumanReviewNotice ? <p className="text-xs font-semibold text-[#6e3f13]">{triageHumanReviewNotice}</p> : null}
            {triageResult ? (
              <article className="rounded-xl border border-[#d9c8a8] bg-[#fff9ef] p-3 text-xs text-[#2d4135]">
                <p><strong>Likely pest:</strong> {triageResult.likelyPest}</p>
                <p className="mt-1"><strong>Confidence:</strong> {Math.round(triageResult.confidence * 100)}%</p>
                <p className="mt-1"><strong>Urgency:</strong> {triageResult.urgency}</p>
                <p className="mt-1"><strong>Recommendation:</strong> {triageResult.recommendedService}</p>
                <p className="mt-1"><strong>Timeline:</strong> {triageResult.recommendedTimeline}</p>
                {triageHumanReviewNotice ? <p className="mt-2 text-[#6e3f13]">Please use call, text, or follow-up request for human confirmation.</p> : null}
              </article>
            ) : null}
          </form>
        ) : null}

        {handoff?.prompt ? (
          <button
            type="button"
            onClick={() => void submitMessage(handoff.prompt)}
            disabled={sending}
            className="mt-3 w-full rounded-xl border border-[#d5c29a] bg-[#fff2d8] px-3 py-2 text-left text-xs font-semibold text-[#4e3c17] disabled:opacity-60"
            aria-label="Continue assistant conversation from booking"
          >
            Continue from booking: {handoff.prompt}
          </button>
        ) : null}

        {showLeadForm ? (
          <form className="mt-3 space-y-2 rounded-xl border border-[#d9c8a8] bg-[#fff4de] p-3" onSubmit={submitLead}>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3e5348]">Quick Follow-Up Request</p>
            <input className="field" name="fullName" placeholder="Full name" required />
            <input className="field" name="phone" placeholder="Phone number" required />
            <input className="field" name="email" placeholder="Email" type="email" />
            <input className="field" name="addressOrZip" placeholder="Address or ZIP" required />
            <input className="field" name="pestType" placeholder="Pest type" />
            <input className="field" name="propertyType" placeholder="Property type" />
            <select className="field" name="urgency" defaultValue="">
              <option value="" disabled>
                Urgency
              </option>
              <option>Emergency / same-day</option>
              <option>Within 48 hours</option>
              <option>This week</option>
            </select>
            <textarea className="field min-h-20" name="details" placeholder="Anything else we should know?" required />
            <button
              type="submit"
              disabled={leadStatus === "submitting"}
              className="w-full rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {leadStatus === "submitting" ? "Submitting..." : "Request Follow-Up"}
            </button>
            {leadMessage ? (
              <p className={`text-xs ${leadStatus === "success" ? "text-emerald-800" : "text-red-700"}`}>{leadMessage}</p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}