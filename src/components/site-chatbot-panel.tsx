"use client";

import { FormEvent, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

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
};

function makeId() {
  return crypto.randomUUID();
}

function initialGreeting() {
  return "Hi, I can answer ExtraSure service questions, suggest appointment windows, and help you request a follow-up in English or Spanish.";
}

export function SiteChatbotPanel({ onClose }: SiteChatbotPanelProps) {
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
  const [handoff, setHandoff] = useState<ApiChatResponse["handoff"]>({
    callHref: "tel:+15169432318",
    smsHref: "sms:+15169432318",
    contactPath: "/contact",
  });

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

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
    trackEvent("ai_chat_message_sent", { source: "site_chatbot" });

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
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as ApiChatResponse;

      setSessionId(data.sessionId);
      setShowLeadForm(data.suggestLeadCapture || data.escalateToHuman);
      setHandoff(data.handoff);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer,
        },
      ]);

      if (data.escalateToHuman) {
        trackEvent("ai_chat_escalation", { source: "site_chatbot" });
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
      trackEvent("ai_chat_lead_submit_success", { source: "site_chatbot" });
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setLeadStatus("error");
      setLeadMessage("Could not submit your details. Please call us for faster help.");
      trackEvent("ai_chat_lead_submit_error", { source: "site_chatbot" });
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

      <div className="max-h-80 space-y-3 overflow-y-auto px-3 py-3">
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
            href={handoff.callHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "call" })}
          >
            Call Team
          </a>
          <a
            href={handoff.smsHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "sms" })}
          >
            Text Team
          </a>
          <a
            href={handoff.contactPath}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
            onClick={() => trackEvent("ai_chat_handoff_click", { channel: "web" })}
          >
            Contact Form
          </a>
        </div>

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