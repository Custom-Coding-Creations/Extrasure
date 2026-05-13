"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { clearBookingAiHandoff, loadBookingAiHandoff, type BookingAiHandoff } from "@/lib/booking-assistant-handoff";
import { ChatbotProvider } from "@/components/chatbot/chatbot-provider";
import { ChatbotLayout } from "@/components/chatbot/chatbot-layout";

export function SiteChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [handoff, setHandoff] = useState<BookingAiHandoff | null>(null);
  
  const isAccountPage = pathname?.startsWith("/account") ?? false;
  const buttonLabel = isAccountPage ? "AI Assistant" : "Chat with ExtraSure AI";
  const buttonClass = isAccountPage
    ? "rounded-full bg-[#163526] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#10271d] transition-colors"
    : "rounded-full bg-[#163526] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#10271d] transition-colors";

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
      {isOpen ? (
        <ChatbotProvider initialHandoff={handoff}>
          <ChatbotLayout onClose={() => setIsOpen(false)} />
        </ChatbotProvider>
      ) : null}

      <button
        type="button"
        className={buttonClass}
        onClick={() => openWithHandoff("site_chatbot")}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
