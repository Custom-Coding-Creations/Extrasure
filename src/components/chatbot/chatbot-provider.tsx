"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { trackEvent, trackTriageEvent } from "@/lib/analytics";
import { isTriageUiEnabled } from "@/lib/triage-runtime";
import type { BookingAiHandoff } from "@/lib/booking-assistant-handoff";

export type ChatRole = "assistant" | "user";

export type UiMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type AccountContext = {
  currentPage?: string;
  pageSummary?: string;
  customerName?: string;
  activePlan?: string;
  lifecycle?: string;
  city?: string;
  lastServiceDate?: string;
  propertyAddress?: string;
};

export type ApiChatResponse = {
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

export type TriageResult = {
  likelyPest: string;
  confidence: number;
  severity: "low" | "moderate" | "high" | "critical";
  urgency: "monitor" | "soon" | "urgent" | "immediate";
  recommendedService: string;
  estimatedPriceRange: string;
  recommendedTimeline: string;
  safetyConsiderations: string[];
  followUpQuestions: string[];
  riskFactors: string[];
  conversionLikelihood: "low" | "medium" | "high";
};

export type HandoffLinks = {
  callHref: string;
  smsHref: string;
  contactPath: string;
};

export type ViewMode = "panel" | "fullscreen";

type ChatbotContextValue = {
  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleFullscreen: () => void;
  
  // Session and messages
  sessionId: string;
  messages: UiMessage[];
  addMessage: (message: UiMessage) => void;
  setMessages: (messages: UiMessage[]) => void;
  
  // Chat input and sending
  input: string;
  setInput: (input: string) => void;
  sending: boolean;
  sendMessage: (message: string) => Promise<void>;
  
  // Account context
  accountContext: AccountContext | null;
  setAccountContext: (context: AccountContext | null) => void;
  
  // Triage state
  triageEnabled: boolean;
  showTriage: boolean;
  setShowTriage: (show: boolean) => void;
  triageSymptom: string;
  setTriageSymptom: (symptom: string) => void;
  triagePhotos: string[];
  setTriagePhotos: (photos: string[]) => void;
  triageLoading: boolean;
  triageError: string;
  triageResult: TriageResult | null;
  triageHumanReviewNotice: string;
  submitTriage: (symptom: string, photos: string[]) => Promise<void>;
  resetTriage: () => void;
  
  // Lead capture state
  showLeadForm: boolean;
  setShowLeadForm: (show: boolean) => void;
  leadStatus: "idle" | "submitting" | "success" | "error";
  leadMessage: string;
  submitLead: (data: {
    name: string;
    phone: string;
    email: string;
    addressOrZip: string;
    pestType: string;
    propertyType: string;
    urgency: string;
    details: string;
  }) => Promise<void>;
  
  // Handoff links
  handoffLinks: HandoffLinks;
  
  // Suggested prompts (context-aware)
  suggestedPrompts: string[];
};

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within ChatbotProvider");
  }
  return context;
}

function makeId() {
  return crypto.randomUUID();
}

function getInitialGreeting(accountContext: AccountContext | null): string {
  if (accountContext?.currentPage) {
    return `I can interpret your ${accountContext.currentPage.toLowerCase()} data, explain current risks, and recommend the next best action for your property.`;
  }
  return "Hi, I can answer ExtraSure service questions, suggest appointment windows, and help you request a follow-up in English or Spanish.";
}

function getSuggestedPrompts(accountContext: AccountContext | null): string[] {
  if (accountContext?.currentPage) {
    // Account-specific prompts
    return [
      "Explain my current protection status.",
      "What should I watch for around my property this month?",
      "How can I reduce mosquito activity near my home?",
      "What should I prepare before my next treatment?",
    ];
  }
  // Guest prompts
  return [
    "What pests are common in my area?",
    "How often should I schedule treatments?",
    "What's included in your service?",
    "Do you offer same-day appointments?",
  ];
}

type ChatbotProviderProps = {
  children: ReactNode;
  initialHandoff?: BookingAiHandoff | null;
  accountContext?: AccountContext | null;
};

export function ChatbotProvider({ children, initialHandoff, accountContext: initialAccountContext }: ChatbotProviderProps) {
  const triageEnabled = isTriageUiEnabled();
  
  // Account context
  const [accountContext, setAccountContext] = useState<AccountContext | null>(initialAccountContext || null);
  
  // View mode - auto-expand on mobile
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "fullscreen";
    }
    return "panel";
  });
  
  // Session and messages
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content: getInitialGreeting(accountContext),
    },
  ]);
  
  // Chat input
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  
  // Triage state
  const [showTriage, setShowTriage] = useState(false);
  const [triageSymptom, setTriageSymptom] = useState("");
  const [triagePhotos, setTriagePhotos] = useState<string[]>([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState("");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [triageHumanReviewNotice, setTriageHumanReviewNotice] = useState("");
  
  // Lead capture state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [leadMessage, setLeadMessage] = useState("");
  
  // Handoff links
  const [handoffLinks, setHandoffLinks] = useState<HandoffLinks>({
    callHref: "tel:+15169432318",
    smsHref: "sms:+15169432318",
    contactPath: "/contact",
  });
  
  // Handle initial handoff from booking wizard
  useEffect(() => {
    if (initialHandoff?.prompt) {
      setInput(initialHandoff.prompt);
      // If there's context, merge it
      if (initialHandoff.context) {
        setAccountContext((prev) => ({ ...prev, ...initialHandoff.context }));
      }
    }
  }, [initialHandoff]);
  
  // Update greeting when account context changes
  useEffect(() => {
    setMessages((prev) => [
      {
        id: makeId(),
        role: "assistant",
        content: getInitialGreeting(accountContext),
      },
      ...prev.slice(1),
    ]);
  }, [accountContext]);
  
  const toggleFullscreen = useCallback(() => {
    setViewMode((prev) => {
      const newMode = prev === "panel" ? "fullscreen" : "panel";
      trackEvent(newMode === "fullscreen" ? "ai_chatbot_expanded" : "ai_chatbot_collapsed", {
        source: accountContext?.currentPage || "site",
      });
      return newMode;
    });
  }, [accountContext]);
  
  const addMessage = useCallback((message: UiMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);
  
  const sendMessage = useCallback(async (messageText: string) => {
    const message = messageText.trim();
    
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
    addMessage(userMessage);
    
    const source = accountContext?.currentPage ? "account_dashboard" : "site_chatbot";
    trackEvent("ai_chat_message_sent", { source, lineageSource: "unified_chatbot" });
    
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content })).slice(-6);
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message,
          history,
          context: accountContext || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Chat request failed");
      }
      
      const data = (await response.json()) as ApiChatResponse;
      
      setSessionId(data.sessionId);
      setHandoffLinks(data.handoff);
      
      addMessage({
        id: makeId(),
        role: "assistant",
        content: data.answer,
      });
      
      if (data.escalateToHuman) {
        trackEvent("ai_chat_escalation", { source, confidence: data.confidence });
      }
      
      if (data.suggestLeadCapture && !accountContext) {
        setShowLeadForm(true);
      }
    } catch (error) {
      addMessage({
        id: makeId(),
        role: "assistant",
        content: "I couldn't finish that right now. You can still call or text the ExtraSure team for immediate help.",
      });
    } finally {
      setSending(false);
    }
  }, [sending, sessionId, messages, accountContext, addMessage]);
  
  const submitTriage = useCallback(async (symptom: string, photos: string[]) => {
    if (!symptom.trim()) {
      setTriageError("Please describe what you're seeing.");
      return;
    }
    
    setTriageLoading(true);
    setTriageError("");
    setTriageHumanReviewNotice("");
    
    const source = accountContext?.currentPage || "site_chatbot";
    trackTriageEvent("triage_started", { source, hasPhotos: photos.length > 0 });
    
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: symptom,
          photoUrls: photos.length > 0 ? photos : undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Triage request failed");
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || "Triage failed");
      }
      
      setTriageResult(data.triage);
      
      if (data.requiresHumanReview) {
        setTriageHumanReviewNotice(
          `This assessment has been flagged for human review due to ${data.humanReviewReason === "low_confidence" ? "low confidence" : data.humanReviewReason === "critical_risk" ? "critical risk factors" : "safety considerations"}. Our team will follow up within 2 hours.`
        );
      }
      
      trackTriageEvent("triage_completed", {
        source,
        confidence: data.triage.confidence,
        severity: data.triage.severity,
        urgency: data.triage.urgency,
        conversionLikelihood: data.triage.conversionLikelihood,
        requiresHumanReview: data.requiresHumanReview,
      });
      
      // Add result to chat
      addMessage({
        id: makeId(),
        role: "assistant",
        content: `Based on your description, this appears to be ${data.triage.likelyPest} (${Math.round(data.triage.confidence * 100)}% confidence). Severity: ${data.triage.severity}, Urgency: ${data.triage.urgency}. Recommended service: ${data.triage.recommendedService}. Estimated cost: ${data.triage.estimatedPriceRange}.`,
      });
    } catch (error) {
      setTriageError("We couldn't complete the assessment right now. Please try again or contact our team directly.");
      trackTriageEvent("triage_failed", { source, error: String(error) });
    } finally {
      setTriageLoading(false);
    }
  }, [sessionId, accountContext, addMessage]);
  
  const resetTriage = useCallback(() => {
    setShowTriage(false);
    setTriageSymptom("");
    setTriagePhotos([]);
    setTriageError("");
    setTriageResult(null);
    setTriageHumanReviewNotice("");
  }, []);
  
  const submitLead = useCallback(async (data: {
    name: string;
    phone: string;
    email: string;
    addressOrZip: string;
    pestType: string;
    propertyType: string;
    urgency: string;
    details: string;
  }) => {
    setLeadStatus("submitting");
    setLeadMessage("");
    
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          source: `ai_chatbot_widget:${sessionId}`,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Lead submission failed");
      }
      
      setLeadStatus("success");
      setLeadMessage("Thanks! We'll be in touch within 2 hours during business hours.");
      trackEvent("ai_chat_lead_submit_success", { source: accountContext?.currentPage || "site_chatbot" });
      
      setTimeout(() => {
        setShowLeadForm(false);
        setLeadStatus("idle");
      }, 3000);
    } catch (error) {
      setLeadStatus("error");
      setLeadMessage("Something went wrong. Please call us directly at (516) 943-2318.");
      trackEvent("ai_chat_lead_submit_error", { source: accountContext?.currentPage || "site_chatbot" });
    }
  }, [sessionId, accountContext]);
  
  const suggestedPrompts = useMemo(() => getSuggestedPrompts(accountContext), [accountContext]);
  
  const value: ChatbotContextValue = {
    viewMode,
    setViewMode,
    toggleFullscreen,
    sessionId,
    messages,
    addMessage,
    setMessages,
    input,
    setInput,
    sending,
    sendMessage,
    accountContext,
    setAccountContext,
    triageEnabled,
    showTriage,
    setShowTriage,
    triageSymptom,
    setTriageSymptom,
    triagePhotos,
    setTriagePhotos,
    triageLoading,
    triageError,
    triageResult,
    triageHumanReviewNotice,
    submitTriage,
    resetTriage,
    showLeadForm,
    setShowLeadForm,
    leadStatus,
    leadMessage,
    submitLead,
    handoffLinks,
    suggestedPrompts,
  };
  
  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
}
