"use client";

import { FormEvent, useMemo, useState } from "react";
import { trackEvent, trackTriageEvent } from "@/lib/analytics";
import { isTriageUiEnabled } from "@/lib/triage-runtime";

type ChatRole = "assistant" | "user";

type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type AssistantContext = {
  currentPage: string;
  pageSummary: string;
  customerName?: string;
  activePlan?: string;
  lifecycle?: string;
  city?: string;
  lastServiceDate?: string;
  propertyAddress?: string;
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

type AccountAiAssistantCardProps = {
  context: AssistantContext;
};

type TriageCardResult = {
  likelyPest: string;
  confidence: number;
  urgency: "monitor" | "soon" | "urgent" | "immediate";
  recommendedService: string;
  estimatedPriceRange: string;
  recommendedTimeline: string;
  safetyConsiderations: string[];
};

function makeId() {
  return crypto.randomUUID();
}

const suggestionPrompts = [
  "Explain my current protection status.",
  "What should I watch for around my property this month?",
  "How can I reduce mosquito activity near my home?",
  "What should I prepare before my next treatment?",
];

export function AccountAiAssistantCard({ context }: AccountAiAssistantCardProps) {
  const triageEnabled = isTriageUiEnabled();
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content: `I can interpret your ${context.currentPage.toLowerCase()} data, explain current risks, and recommend the next best action for your property.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [triageInput, setTriageInput] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageCardResult | null>(null);
  const [triageError, setTriageError] = useState("");
  const [triageHumanReviewNotice, setTriageHumanReviewNotice] = useState("");
  const [handoff, setHandoff] = useState<ApiChatResponse["handoff"]>({
    callHref: "tel:+15169432318",
    smsHref: "sms:+15169432318",
    contactPath: "/contact",
  });

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();

    if (!message || sending) {
      return;
    }

    const userMessage: UiMessage = {
      id: makeId(),
      role: "user",
      content: message,
    };

    setInput("");
    setSending(true);
    setMessages((current) => [...current, userMessage]);
    trackEvent("ai_chat_message_sent", { source: "account_dashboard", lineageSource: "legacy_chat" });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message,
          history,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as ApiChatResponse;

      setSessionId(data.sessionId);
      setHandoff(data.handoff);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: "I couldn't finish that right now. You can still call or text the ExtraSure team for immediate help.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  async function runTriage() {
    const message = triageInput.trim();

    if (!message || triageLoading) {
      return;
    }

    setTriageLoading(true);
    setTriageError("");

    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          answers: [
            {
              question: "Dashboard symptom summary",
              answer: message,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("triage_failed");
      }

      const payload = (await response.json()) as {
        triage: TriageCardResult;
        requiresHumanReview: boolean;
        humanReviewReason: "critical_risk" | "low_confidence" | "safety_escalation" | null;
        humanReviewThreshold: number;
      };
      setTriageResult(payload.triage);
      setTriageHumanReviewNotice(
        payload.requiresHumanReview
          ? payload.humanReviewReason === "low_confidence"
            ? `Confidence is below ${Math.round(payload.humanReviewThreshold * 100)}%. Human review is recommended.`
            : "Human review is recommended before final treatment decisions."
          : "",
      );
      trackTriageEvent("dashboard_completed", {
        lineageSource: "triage_engine",
        completionQualityScore: payload.triage.confidence,
        userConfidenceSelection: payload.triage.confidence >= 0.75 ? "high" : payload.triage.confidence >= 0.55 ? "medium" : "low",
      });
    } catch {
      setTriageError("Could not run symptom analysis right now.");
      setTriageHumanReviewNotice("");
      trackTriageEvent("dashboard_failed", { lineageSource: "triage_engine" });
    } finally {
      setTriageLoading(false);
    }
  }

  return (
    <section className="dashboard-atmosphere rounded-3xl border border-[#d8ccaf] p-5 dark:border-[#4d6751] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#61776c] dark:text-[#cabda2]">Property intelligence system</p>
          <h3 className="mt-2 text-xl text-[#173126] dark:text-[#f1e7d2]">Context-aware guidance for protection, service prep, and risk awareness</h3>
          <p className="mt-2 max-w-2xl text-sm text-[#40584a] dark:text-[#d5c8ad]">Ask for a plain-language explanation of your current protection state, seasonal watchpoints, billing impact, or preparation steps before the next visit.</p>
        </div>
        <div className="rounded-full border border-[#d8cbaf] bg-[rgba(255,250,240,0.74)] px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#305145] dark:border-[#4f6953] dark:bg-[rgba(32,53,42,0.78)] dark:text-[#e4d8c0]">
          Embedded AI support
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[#dbcdb1] bg-[rgba(255,252,244,0.78)] p-4 dark:border-[#4f6953] dark:bg-[rgba(30,48,39,0.82)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#657c70] dark:text-[#c6bba0]">Current dashboard context</p>
          <p className="mt-2 text-sm leading-6 text-[#40584a] dark:text-[#d5c8ad]">{context.pageSummary}</p>
        </div>
        <div className="rounded-2xl border border-[#dbcdb1] bg-[rgba(255,252,244,0.78)] p-4 dark:border-[#4f6953] dark:bg-[rgba(30,48,39,0.82)]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#657c70] dark:text-[#c6bba0]">Suggested uses</p>
          <ul className="mt-2 grid gap-2 text-sm text-[#40584a] dark:text-[#d5c8ad]">
            <li>Interpret your protection score and risk signals.</li>
            <li>Explain treatment preparation and safety expectations.</li>
            <li>Recommend seasonal prevention steps for your property.</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestionPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            className="rounded-full border border-[#d2c5a9] bg-[#fff7e8] px-3 py-2 text-xs font-semibold text-[#294236] transition hover:bg-[#f1e5cf] dark:border-[#506a54] dark:bg-[#243a2f] dark:text-[#e8ddc7]"
          >
            {prompt}
          </button>
        ))}
        {triageEnabled ? (
          <button
            type="button"
            onClick={() => setTriageInput("Persistent activity near baseboards and kitchen at night")}
            className="rounded-full border border-[#d2c5a9] bg-[#fff7e8] px-3 py-2 text-xs font-semibold text-[#294236] transition hover:bg-[#f1e5cf] dark:border-[#506a54] dark:bg-[#243a2f] dark:text-[#e8ddc7]"
          >
            Analyze symptoms
          </button>
        ) : null}
      </div>

      {triageEnabled ? (
        <div className="mt-4 rounded-2xl border border-[#ddd2b7] bg-[rgba(255,248,234,0.92)] p-3 dark:border-[#516b55] dark:bg-[rgba(36,58,47,0.9)]">
        <div className="flex items-center gap-2">
          <input
            className="field flex-1"
            value={triageInput}
            onChange={(event) => setTriageInput(event.target.value)}
            placeholder="Describe symptoms for AI triage"
            aria-label="Symptom triage input"
          />
          <button
            type="button"
            onClick={() => void runTriage()}
            disabled={triageLoading}
            className="rounded-xl bg-[#163526] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {triageLoading ? "..." : "Analyze"}
          </button>
        </div>
          {triageError ? <p className="mt-2 text-xs text-red-700">{triageError}</p> : null}
          {triageHumanReviewNotice ? <p className="mt-2 text-xs font-semibold text-[#6e3f13] dark:text-[#f0c997]">{triageHumanReviewNotice}</p> : null}
        {triageResult ? (
          <article className="mt-2 rounded-xl border border-[#d9c8a8] bg-[#fffdf6] p-3 text-xs text-[#253a2f] dark:border-[#536d56] dark:bg-[#21362b] dark:text-[#eee3ce]">
            <p><strong>Likely pest:</strong> {triageResult.likelyPest}</p>
            <p className="mt-1"><strong>Confidence:</strong> {Math.round(triageResult.confidence * 100)}%</p>
            <p className="mt-1"><strong>Urgency:</strong> {triageResult.urgency}</p>
            <p className="mt-1"><strong>Recommended service:</strong> {triageResult.recommendedService}</p>
            <p className="mt-1"><strong>Price range:</strong> {triageResult.estimatedPriceRange}</p>
            <p className="mt-1"><strong>Timeline:</strong> {triageResult.recommendedTimeline}</p>
          </article>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-[#ddd2b7] bg-[rgba(255,248,234,0.92)] p-3 dark:border-[#516b55] dark:bg-[rgba(36,58,47,0.9)]">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
              message.role === "assistant"
                ? "border border-[#d9c8a8] bg-[#fffdf6] text-[#253a2f] dark:border-[#536d56] dark:bg-[#21362b] dark:text-[#eee3ce]"
                : "ml-6 bg-[#1f3f2f] text-[#f4fff8]"
            }`}
          >
            {message.content}
          </article>
        ))}
      </div>

      <form className="mt-4 flex items-center gap-2" onSubmit={onSubmit}>
        <input
          className="field flex-1"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your protection status, seasonal risks, or next best action"
          aria-label="Account AI message"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sending ? "..." : "Ask"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <a href={handoff.callHref} className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]">
          Call Team
        </a>
        <a href={handoff.smsHref} className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]">
          Text Team
        </a>
        <a href={handoff.contactPath} className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]">
          Contact Form
        </a>
      </div>
    </section>
  );
}