"use client";

import { FormEvent, useState } from "react";

type ChatRole = "user" | "assistant";

type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ManualAssistantApiResponse = {
  ok: true;
  answer: string;
  confidence: "low" | "medium" | "high";
  sourceTitles: string[];
  sourcePaths?: string[];
  scope?: {
    inScope: boolean;
    reason: string;
  };
};

function createId() {
  return crypto.randomUUID();
}

export function AdminManualAssistant() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Hi, I am your operations helper. Ask me how this system works in plain language, and I will explain step by step.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastSources, setLastSources] = useState<string[]>([]);
  const [lastSourcePaths, setLastSourcePaths] = useState<string[]>([]);
  const [lastConfidence, setLastConfidence] = useState<"low" | "medium" | "high">("medium");
  const [lastScopeStatus, setLastScopeStatus] = useState<string>("in-scope");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || sending) {
      return;
    }

    const nextUserMessage: UiMessage = {
      id: createId(),
      role: "user",
      content: message,
    };

    const nextHistory = [...messages, nextUserMessage]
      .map((entry) => ({ role: entry.role, content: entry.content }))
      .slice(-8);

    setInput("");
    setError("");
    setSending(true);
    setMessages((current) => [...current, nextUserMessage]);

    try {
      const response = await fetch("/api/admin/manual-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: nextHistory,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "I could not answer right now. Please try again.");
      }

      const payload = (await response.json()) as ManualAssistantApiResponse;

      setLastSources(payload.sourceTitles);
      setLastSourcePaths(payload.sourcePaths ?? []);
      setLastConfidence(payload.confidence);
      setLastScopeStatus(payload.scope?.inScope ? "in-scope" : "out-of-scope");
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: payload.answer,
        },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "I could not answer right now. Please try again.");
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "I hit a temporary issue. If this is urgent, start with the incident section and verify deployment, payments, and admin access in that order.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Ask the Operations Assistant</h2>
          <p className="mt-2 text-sm text-[#445349]">
            Describe what you are trying to do. You can ask things like where a setting lives, what an environment variable does, how deployment works,
            or where a behavior lives in the codebase.
          </p>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[#deceb0] bg-[#fff4df] px-3 py-2 text-xs text-[#445349]">Confidence: {lastConfidence}</div>
          <div className="rounded-lg border border-[#deceb0] bg-[#fff4df] px-3 py-2 text-xs text-[#445349]">Scope: {lastScopeStatus}</div>
        </div>
      </div>

      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-[#deceb0] bg-[#fffdf6] p-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[92%] rounded-xl border px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto border-[#35506b] bg-[#e8f0f8] text-[#1f3449]"
                : "mr-auto border-[#d8c9ac] bg-[#fff8e8] text-[#33443a]"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">{message.role === "user" ? "You" : "Assistant"}</p>
            <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
          </article>
        ))}
      </div>

      {error ? <p className="mt-3 rounded-lg border border-[#e9b2a0] bg-[#fff0ea] p-3 text-sm text-[#8a3d22]">{error}</p> : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <label htmlFor="admin-manual-assistant-input" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">
          Your question
        </label>
        <textarea
          id="admin-manual-assistant-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Example: I need to rotate a Stripe webhook secret. Where do I do it and what should I verify after?"
          rows={3}
          className="w-full rounded-xl border border-[#c9bb9e] bg-white px-3 py-2 text-sm text-[#1b2f25] placeholder-[#9a978f]"
        />
        <button
          type="submit"
          disabled={sending || input.trim().length === 0}
          className="self-start rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] transition hover:bg-[#142420] disabled:cursor-not-allowed disabled:border-[#c9bb9e] disabled:bg-[#d7ccb5] disabled:text-[#726a5c]"
        >
          {sending ? "Thinking..." : "Ask assistant"}
        </button>
      </form>

      {lastSources.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">Sources used</p>
          <p className="mt-1 text-sm text-[#445349]">{lastSources.join(" | ")}</p>
          {lastSourcePaths.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5d7267]">Codebase citations</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {lastSourcePaths.map((sourcePath) => (
                  <li key={sourcePath}>{sourcePath}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}