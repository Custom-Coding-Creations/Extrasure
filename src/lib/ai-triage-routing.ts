type TriageTranscriptPayload = {
  sessionId: string;
  assessmentId: string | null;
  customerId: string | null;
  message: string;
  usedFallback: boolean;
  severity: "low" | "moderate" | "high" | "critical";
  urgency: "monitor" | "soon" | "urgent" | "immediate";
  conversionLikelihood: "low" | "medium" | "high";
};

export async function routeTriageTranscript(payload: TriageTranscriptPayload) {
  const webhook = process.env.AI_TRIAGE_TRANSCRIPT_WEBHOOK_URL ?? process.env.AI_TRANSCRIPT_WEBHOOK_URL;

  if (!webhook) {
    console.info("AI triage transcript captured with no triage transcript webhook configured", {
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType: "ai_triage_assessment",
        ...payload,
        createdAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    console.error("Transcript routing failed for AI triage session", payload.sessionId);
  }
}