"use client";

import { useState } from "react";
import { ChatbotProvider } from "@/components/chatbot/chatbot-provider";
import { ChatbotLayout } from "@/components/chatbot/chatbot-layout";
import { isTriageUiEnabled } from "@/lib/triage-runtime";
import type { AccountContext } from "@/components/chatbot/chatbot-provider";

type AccountAiAssistantCardProps = {
  context: AccountContext;
};

export function AccountAiAssistantCard({ context }: AccountAiAssistantCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triageEnabled = isTriageUiEnabled();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <ChatbotProvider accountContext={context}>
            <ChatbotLayout onClose={() => setIsOpen(false)} />
          </ChatbotProvider>
        </div>
      )}

      <section className="dashboard-atmosphere rounded-3xl border border-[#d8ccaf] p-5 dark:border-[#4d6751] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#1a3327] dark:text-[#f1e8d3]">AI Assistant</h3>
            <p className="mt-1 text-sm text-[#41594b] dark:text-[#d2c6aa]">Context-aware help for {context.currentPage?.toLowerCase() || "your account"}</p>
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

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white hover:bg-[#10271d] sm:w-auto"
          >
            Open AI Assistant
          </button>
          <p className="mt-2 text-xs text-[#657c70] dark:text-[#c6bba0]">
            Get instant answers about your {context.currentPage?.toLowerCase() || "account"}, ask questions about your protection status, or get help with billing{triageEnabled ? ", or run pest triage" : ""}.
          </p>
        </div>
      </section>
    </>
  );
}
