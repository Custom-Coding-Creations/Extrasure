"use client";

import { useEffect } from "react";
import { useChatbot } from "./chatbot-provider";
import { ChatWindow } from "./chat-window";
import { TriageForm } from "./triage-form";
import { LeadCaptureForm } from "./lead-capture-form";

type ChatbotLayoutProps = {
  onClose: () => void;
  suggestedPromptsButton?: React.ReactNode;
};

export function ChatbotLayout({ onClose, suggestedPromptsButton }: ChatbotLayoutProps) {
  const {
    viewMode,
    toggleFullscreen,
    triageEnabled,
    showTriage,
    setShowTriage,
    showLeadForm,
    accountContext,
    suggestedPrompts,
    sendMessage,
    sending,
    input,
    setInput,
    handoffLinks,
  } = useChatbot();

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && viewMode === "fullscreen") {
        toggleFullscreen();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [viewMode, toggleFullscreen]);

  const isFullscreen = viewMode === "fullscreen";
  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    : "";
  
  const panelClass = isFullscreen
    ? "flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.4)]"
    : "flex max-h-[min(85vh,48rem)] w-[min(94vw,24rem)] flex-col overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.25)]";

  const chatHeightClass = isFullscreen ? "max-h-[60vh]" : "max-h-80";

  const content = (
    <section className={panelClass}>
      <header className="flex shrink-0 items-center justify-between bg-[#163526] px-4 py-3 text-white">
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {accountContext?.currentPage ? `ExtraSure AI Assistant - ${accountContext.currentPage}` : "ExtraSure AI Assistant"}
          </p>
          <p className="text-[11px] text-[#d8eadf]">Answers, estimates, and fast human handoff</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md border border-[#c8ddcf] px-2 py-1 text-xs text-[#ecf7f0] hover:bg-[#1e4a32]"
            aria-label={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          >
            {isFullscreen ? "Exit Fullscreen" : "Expand"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#c8ddcf] px-2 py-1 text-xs text-[#ecf7f0] hover:bg-[#1e4a32]"
            aria-label="Close chatbot"
          >
            Close
          </button>
        </div>
      </header>

      {/* Message display with dynamic height */}
      <div className={`${chatHeightClass} shrink-0 space-y-3 overflow-y-auto px-3 py-3`} aria-live="polite" aria-label="Chat conversation">
        {useChatbot().messages.map((message) => (
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

      {/* Input and controls area */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#dbc9a9] bg-[#fffdf6] p-3">
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void sendMessage(input); }}>
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

        {/* Suggested prompts */}
        {suggestedPrompts.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#536359]">Suggested prompts</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={sending}
                  className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Triage toggle button */}
        {triageEnabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTriage(!showTriage)}
              className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-xs text-[#294236] transition hover:bg-[#ead5b5]"
            >
              {showTriage ? "Hide triage" : "Start AI pest triage"}
            </button>
          </div>
        )}

        {/* Triage form */}
        {triageEnabled && showTriage && <TriageForm />}

        {/* Custom suggestion button slot */}
        {suggestedPromptsButton}

        {/* Lead capture form */}
        {showLeadForm && <LeadCaptureForm />}
      </div>
    </section>
  );

  // Wrap in fullscreen overlay if needed
  if (isFullscreen) {
    return <div className={containerClass}>{content}</div>;
  }

  return content;
}
