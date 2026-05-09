import { NextRequest, NextResponse } from "next/server";
import { buildKnowledgeContext } from "@/lib/ai-knowledge";
import { detectLanguage, evaluateGuardrails, policySnippetFor, type AiLanguage } from "@/lib/ai-policy";
import { company } from "@/lib/site";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequest = {
  sessionId?: string;
  message?: string;
  history?: ChatMessage[];
};

type ChatResponsePayload = {
  ok: true;
  sessionId: string;
  answer: string;
  language: AiLanguage;
  confidence: "low" | "medium" | "high";
  escalateToHuman: boolean;
  policyReferences: string[];
  suggestLeadCapture: boolean;
  handoff: {
    callHref: string;
    smsHref: string;
    contactPath: string;
  };
};

function ensureSessionId(sessionId: string | undefined) {
  if (sessionId && sessionId.trim().length > 0) {
    return sessionId.trim();
  }

  return `chat_${crypto.randomUUID()}`;
}

function normalizeHistory(history: ChatMessage[] | undefined) {
  if (!Array.isArray(history)) {
    return [] as ChatMessage[];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-6);
}

function buildGuardrailReply(language: AiLanguage, policySnippet: string) {
  if (language === "es") {
    return `${policySnippet} Puedo conectarte con nuestro equipo para una respuesta segura y especifica para tu situacion.`;
  }

  return `${policySnippet} I can connect you with our licensed team for a safe, case-specific answer.`;
}

function appointmentSuggestion(language: AiLanguage, input: string) {
  const urgent = /\b(urgent|asap|today|same day|emergency|urgente|hoy)\b/i.test(input);

  if (language === "es") {
    return urgent
      ? "Podemos sugerir una visita el mismo dia segun disponibilidad. El horario final lo confirma el personal."
      : "Podemos sugerir una ventana de cita y el personal confirma el horario final contigo.";
  }

  return urgent
    ? "We can suggest a same-day visit window when available, with final confirmation by staff."
    : "We can suggest an appointment window, and staff will confirm the final slot with you.";
}

function shouldSuggestLeadCapture(input: string) {
  return /\b(quote|estimate|pricing|book|appointment|inspection|help|issue|problem|precio|cotizacion|cita|inspeccion|ayuda)\b/i.test(input);
}

async function callOpenAiAnswer(args: {
  language: AiLanguage;
  message: string;
  history: ChatMessage[];
  contextText: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_CHAT_MODEL ?? "gpt-4.1-mini";

  const systemPrompt =
    args.language === "es"
      ? [
          "Eres el asistente web de ExtraSure Pest Control.",
          "Responde solo con informacion de contexto interno proporcionado.",
          "No des consejos medicos o legales.",
          "No des afirmaciones definitivas de seguridad de pesticidas.",
          "No garantices precio final sin inspeccion; solo rangos no vinculantes.",
          "Siempre ofrece opcion de contacto humano al final.",
        ].join(" ")
      : [
          "You are the website assistant for ExtraSure Pest Control.",
          "Answer only from provided internal context.",
          "Do not provide medical or legal guidance.",
          "Do not provide definitive pesticide safety claims.",
          "Do not guarantee final pricing without inspection; only non-binding ranges.",
          "Always offer a human handoff option at the end.",
        ].join(" ");

  const userPrompt =
    args.language === "es"
      ? `Mensaje del cliente: ${args.message}\n\nContexto interno:\n${args.contextText}`
      : `Customer message: ${args.message}\n\nInternal context:\n${args.contextText}`;

  const conversation = args.history.map((item) => ({ role: item.role, content: item.content }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversation,
        { role: "user", content: userPrompt },
      ],
      max_tokens: 280,
    }),
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  return content && content.length > 0 ? content : null;
}

function fallbackAnswer(language: AiLanguage, contextText: string, confidence: "low" | "medium" | "high", message: string) {
  const appointment = appointmentSuggestion(language, message);

  if (language === "es") {
    if (confidence === "low") {
      return [
        "No tengo suficiente contexto interno para responder con alta confianza.",
        "Puedo pasarte con nuestro equipo para una respuesta precisa.",
        appointment,
      ].join(" ");
    }

    return [
      `Segun nuestra base interna: ${contextText}`,
      "Si quieres, te ayudo a dejar tus datos para seguimiento rapido.",
      appointment,
    ].join(" ");
  }

  if (confidence === "low") {
    return [
      "I do not have enough internal context to answer with high confidence.",
      "I can hand this off to our team for an exact response.",
      appointment,
    ].join(" ");
  }

  return [
    `Based on our approved internal information: ${contextText}`,
    "If you want, I can help capture your details for rapid follow-up.",
    appointment,
  ].join(" ");
}

async function routeTranscript(payload: {
  sessionId: string;
  message: string;
  answer: string;
  confidence: "low" | "medium" | "high";
  escalateToHuman: boolean;
  language: AiLanguage;
  policyReferences: string[];
}) {
  const webhook = process.env.AI_TRANSCRIPT_WEBHOOK_URL;

  if (!webhook) {
    console.info("AI transcript captured with no transcript webhook configured", {
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
        ...payload,
        createdAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    console.error("Transcript routing failed for AI chat session", payload.sessionId);
  }
}

export async function POST(request: NextRequest) {
  let payload: ChatRequest;

  try {
    payload = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = payload.message?.trim() ?? "";

  if (message.length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const sessionId = ensureSessionId(payload.sessionId);
  const language = detectLanguage(message);
  const history = normalizeHistory(payload.history);
  const guardrail = evaluateGuardrails(message);

  if (guardrail.blocked && guardrail.reasonCode) {
    const policyReference = policySnippetFor(guardrail.reasonCode, language);
    const answer = buildGuardrailReply(language, policyReference);

    const responsePayload: ChatResponsePayload = {
      ok: true,
      sessionId,
      answer,
      language,
      confidence: "high",
      escalateToHuman: true,
      policyReferences: [policyReference],
      suggestLeadCapture: true,
      handoff: {
        callHref: company.phoneHref,
        smsHref: company.smsHref,
        contactPath: "/contact",
      },
    };

    await routeTranscript({
      sessionId,
      message,
      answer,
      confidence: responsePayload.confidence,
      escalateToHuman: responsePayload.escalateToHuman,
      language,
      policyReferences: responsePayload.policyReferences,
    });

    return NextResponse.json(responsePayload, { status: 200 });
  }

  const knowledge = buildKnowledgeContext(message);
  const aiAnswer = await callOpenAiAnswer({
    language,
    message,
    history,
    contextText: knowledge.contextText,
  });

  const answer = aiAnswer ?? fallbackAnswer(language, knowledge.contextText, knowledge.confidence, message);
  const escalateToHuman = knowledge.confidence === "low";

  const responsePayload: ChatResponsePayload = {
    ok: true,
    sessionId,
    answer,
    language,
    confidence: knowledge.confidence as "low" | "high" | "medium",
    escalateToHuman,
    policyReferences: [],
    suggestLeadCapture: shouldSuggestLeadCapture(message),
    handoff: {
      callHref: company.phoneHref,
      smsHref: company.smsHref,
      contactPath: "/contact",
    },
  };

  await routeTranscript({
    sessionId,
    message,
    answer,
    confidence: responsePayload.confidence,
    escalateToHuman: responsePayload.escalateToHuman,
    language,
    policyReferences: responsePayload.policyReferences,
  });

  return NextResponse.json(responsePayload, { status: 200 });
}
