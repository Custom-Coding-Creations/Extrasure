"use client";

type EventPayload = Record<string, string | number | boolean | null | undefined>;

export type TriageAnalyticsPayload = EventPayload & {
  lineageSource?: "legacy_chat" | "triage_engine" | "triage_assisted_chat";
  completionQualityScore?: number;
  userConfidenceSelection?: "low" | "medium" | "high";
  followUpAccepted?: boolean;
  handoffSatisfaction?: "negative" | "neutral" | "positive";
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, payload: EventPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const event = {
    event: eventName,
    ...payload,
  };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event);
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
  }
}

export function trackTriageEvent(eventName: string, payload: TriageAnalyticsPayload = {}) {
  const normalizedName = eventName.startsWith("triage_") ? eventName : `triage_${eventName}`;

  trackEvent(normalizedName, {
    lineageSource: payload.lineageSource ?? "triage_engine",
    ...payload,
  });
}
