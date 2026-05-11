"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const SiteChatbotPanel = dynamic(
  () => import("@/components/site-chatbot-panel").then((module) => module.SiteChatbotPanel),
  { ssr: false },
);

export function SiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      {isOpen ? <SiteChatbotPanel onClose={() => setIsOpen(false)} /> : null}

      <button
        type="button"
        className="rounded-full bg-[#163526] px-4 py-3 text-sm font-semibold text-white shadow-lg"
        onClick={() => {
          setIsOpen(true);
          trackEvent("ai_chat_open", { source: "site_chatbot" });
        }}
      >
        Chat with ExtraSure AI
      </button>
    </div>
  );
}
