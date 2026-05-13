export type AiLanguage = "en" | "es";

export type GuardrailDecision = {
  blocked: boolean;
  reasonCode?: "medical_legal" | "pesticide_safety" | "guaranteed_pricing";
  policySnippet?: string;
};

export const TRIAGE_MIN_CONFIDENCE_FOR_ASSERTIVE_LABEL = 0.7;

const MEDICAL_OR_LEGAL_PATTERN = /\b(medical|doctor|diagnose|diagnosis|legal|lawsuit|attorney|lawyer|sue)\b/i;
const PESTICIDE_SAFETY_PATTERN = /\b(is it safe|safe for (kids|children|pets)|toxic|poison|poisonous|pregnant|pregnancy)\b/i;
const GUARANTEED_PRICE_PATTERN = /\b(guarantee(d)?\s+price|exact\s+price|final\s+price|locked\s+price|quote\s+guarantee)\b/i;

const POLICY_SNIPPETS: Record<Exclude<GuardrailDecision["reasonCode"], undefined>, { en: string; es: string }> = {
  medical_legal: {
    en: "Policy: We do not provide medical or legal guidance. A licensed professional should advise on those topics.",
    es: "Politica: No brindamos orientacion medica ni legal. Para esos temas debe consultar a un profesional autorizado.",
  },
  pesticide_safety: {
    en: "Policy: We avoid definitive pesticide safety claims in chat and route those questions to licensed staff.",
    es: "Politica: Evitamos dar afirmaciones definitivas sobre seguridad de pesticidas por chat y escalamos esas preguntas al personal autorizado.",
  },
  guaranteed_pricing: {
    en: "Policy: We cannot guarantee final pricing before an inspection. We can only provide non-binding ranges.",
    es: "Politica: No podemos garantizar un precio final antes de una inspeccion. Solo podemos ofrecer rangos no vinculantes.",
  },
};

export function detectLanguage(input: string): AiLanguage {
  const normalized = input.toLowerCase();
  const spanishSignals = ["hola", "precio", "cotizacion", "cita", "plagas", "cucarachas", "hormigas", "urgente", "gracias"];
  const score = spanishSignals.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
  return score >= 2 ? "es" : "en";
}

export function evaluateGuardrails(userInput: string): GuardrailDecision {
  if (MEDICAL_OR_LEGAL_PATTERN.test(userInput)) {
    return {
      blocked: true,
      reasonCode: "medical_legal",
      policySnippet: POLICY_SNIPPETS.medical_legal.en,
    };
  }

  if (PESTICIDE_SAFETY_PATTERN.test(userInput)) {
    return {
      blocked: true,
      reasonCode: "pesticide_safety",
      policySnippet: POLICY_SNIPPETS.pesticide_safety.en,
    };
  }

  if (GUARANTEED_PRICE_PATTERN.test(userInput)) {
    return {
      blocked: true,
      reasonCode: "guaranteed_pricing",
      policySnippet: POLICY_SNIPPETS.guaranteed_pricing.en,
    };
  }

  return { blocked: false };
}

export function policySnippetFor(reasonCode: Exclude<GuardrailDecision["reasonCode"], undefined>, language: AiLanguage) {
  return POLICY_SNIPPETS[reasonCode][language];
}

export function shouldEscalateTriageToHuman(confidence: number, severity: "low" | "moderate" | "high" | "critical") {
  if (severity === "critical") {
    return true;
  }

  return confidence < TRIAGE_MIN_CONFIDENCE_FOR_ASSERTIVE_LABEL;
}
