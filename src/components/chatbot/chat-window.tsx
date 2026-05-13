"use client";

import { FormEvent } from "react";
import { useChatbot } from "./chatbot-provider";

export function ChatWindow() {
  const { messages, input, setInput, sending, sendMessage, handoffLinks } = useChatbot();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <>
      <div className="max-h-80 shrink-0 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite" aria-label="Chat conversation">
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

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#dbc9a9] bg-[#fffdf6] p-3">
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
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
          >
            Call Team
          </a>
          <a
            href={handoffLinks.smsHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
          >
            Text Team
          </a>
          <a
            href={handoffLinks.contactPath}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
          >
            Contact Form
          </a>
        </div>
      </div>
    </>
  );
}
