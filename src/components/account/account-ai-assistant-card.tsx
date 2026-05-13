"use client";

import { FormEvent, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

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

function makeId() {
  return crypto.randomUUID();
}

const suggestionPrompts = [
  "What should I prepare before my next treatment?",
  "Explain my current protection plan in plain language.",
  "What risks should I watch for around my property this month?",
];

export function AccountAiAssistantCard({ context }: AccountAiAssistantCardProps) {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content: `I can help with ${context.currentPage.toLowerCase()}, property questions, treatment preparation, billing clarity, and next-step recommendations.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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
    trackEvent("ai_chat_message_sent", { source: "account_dashboard" });

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

  return (
    <section className="rounded-3xl border border-[#d8ccaf] bg-[#fffdf6] p-5 dark:border-[#4d6751] dark:bg-[#1f3328]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#61776c] dark:text-[#cabda2]">Account AI Assistant</p>
          <h3 className="mt-2 text-xl text-[#173126] dark:text-[#f1e7d2]">Context-aware help for your property and plan</h3>
          <p className="mt-2 text-sm text-[#40584a] dark:text-[#d5c8ad]">Ask about your property profile, service cadence, treatment preparation, or billing status.</p>
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
      </div>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-[#ddd2b7] bg-[#fff8ea] p-3 dark:border-[#516b55] dark:bg-[#243a2f]">
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
          placeholder="Ask about your property, treatment plan, or billing"
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