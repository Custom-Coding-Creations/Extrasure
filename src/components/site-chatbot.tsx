"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { clearBookingAiHandoff, loadBookingAiHandoff, type BookingAiHandoff } from "@/lib/booking-assistant-handoff";

const SiteChatbotPanel = dynamic(
  () => import("@/components/site-chatbot-panel").then((module) => module.SiteChatbotPanel),
  { ssr: false },
);

export function SiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [handoff, setHandoff] = useState<BookingAiHandoff | null>(null);

  function openWithHandoff(source: string) {
    if (typeof window !== "undefined") {
      const nextHandoff = loadBookingAiHandoff(window.sessionStorage);

      if (nextHandoff) {
        setHandoff(nextHandoff);
        clearBookingAiHandoff(window.sessionStorage);
      }
    }

    setIsOpen(true);
    trackEvent("ai_chat_open", { source });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOpen = () => {
      openWithHandoff("booking_wizard");
    };

    window.addEventListener("extrasure:open-site-chatbot", handleOpen);

    return () => {
      window.removeEventListener("extrasure:open-site-chatbot", handleOpen);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      {isOpen ? <SiteChatbotPanel onClose={() => setIsOpen(false)} handoff={handoff} /> : null}

      <button
        type="button"
        className="rounded-full bg-[#163526] px-4 py-3 text-sm font-semibold text-white shadow-lg"
        onClick={() => openWithHandoff("site_chatbot")}
      >
        Chat with ExtraSure AI
      </button>
    </div>
  );
}
