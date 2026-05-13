export type TriageSeverity = "low" | "moderate" | "high" | "critical";
export type TriageUrgency = "monitor" | "soon" | "urgent" | "immediate";
export type TriageConversionLikelihood = "low" | "medium" | "high";

export type TriageAssessmentOutput = {
  likelyPest: string;
  confidence: number;
  severity: TriageSeverity;
  urgency: TriageUrgency;
  recommendedService: string;
  estimatedPriceRange: string;
  recommendedTimeline: string;
  safetyConsiderations: string[];
  followUpQuestions: string[];
  riskFactors: string[];
  conversionLikelihood: TriageConversionLikelihood;
};

const VALID_SEVERITIES = new Set<TriageSeverity>(["low", "moderate", "high", "critical"]);
const VALID_URGENCY = new Set<TriageUrgency>(["monitor", "soon", "urgent", "immediate"]);
const VALID_CONVERSION = new Set<TriageConversionLikelihood>(["low", "medium", "high"]);

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNormalizedStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

export function validateTriageAssessmentOutput(raw: unknown):
  | { ok: true; data: TriageAssessmentOutput }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Triage response must be an object." };
  }

  const value = raw as Record<string, unknown>;
  const likelyPest = asTrimmedString(value.likelyPest);
  const confidence = clampConfidence(value.confidence);
  const severity = asTrimmedString(value.severity) as TriageSeverity;
  const urgency = asTrimmedString(value.urgency) as TriageUrgency;
  const recommendedService = asTrimmedString(value.recommendedService);
  const estimatedPriceRange = asTrimmedString(value.estimatedPriceRange);
  const recommendedTimeline = asTrimmedString(value.recommendedTimeline);
  const safetyConsiderations = asNormalizedStringArray(value.safetyConsiderations);
  const followUpQuestions = asNormalizedStringArray(value.followUpQuestions);
  const riskFactors = asNormalizedStringArray(value.riskFactors);
  const conversionLikelihood = asTrimmedString(value.conversionLikelihood) as TriageConversionLikelihood;

  if (!likelyPest) {
    return { ok: false, error: "Missing likelyPest." };
  }

  if (confidence === null) {
    return { ok: false, error: "Missing confidence number." };
  }

  if (!VALID_SEVERITIES.has(severity)) {
    return { ok: false, error: "Invalid severity." };
  }

  if (!VALID_URGENCY.has(urgency)) {
    return { ok: false, error: "Invalid urgency." };
  }

  if (!recommendedService) {
    return { ok: false, error: "Missing recommendedService." };
  }

  if (!estimatedPriceRange) {
    return { ok: false, error: "Missing estimatedPriceRange." };
  }

  if (!recommendedTimeline) {
    return { ok: false, error: "Missing recommendedTimeline." };
  }

  if (!safetyConsiderations.length || !followUpQuestions.length || !riskFactors.length) {
    return { ok: false, error: "Missing required triage list fields." };
  }

  if (!VALID_CONVERSION.has(conversionLikelihood)) {
    return { ok: false, error: "Invalid conversionLikelihood." };
  }

  return {
    ok: true,
    data: {
      likelyPest,
      confidence,
      severity,
      urgency,
      recommendedService,
      estimatedPriceRange,
      recommendedTimeline,
      safetyConsiderations,
      followUpQuestions,
      riskFactors,
      conversionLikelihood,
    },
  };
}

export function buildDeterministicTriageFallback(message: string): TriageAssessmentOutput {
  const normalized = message.toLowerCase();
  const rodentSignal = /dropping|droppings|gnaw|mouse|mice|rat/.test(normalized);
  const termiteSignal = /mud\s+tube|termite|wood\s+damage|frass/.test(normalized);
  const bedBugSignal = /bed\s*bug|bites|mattress|welts/.test(normalized);
  const immediateSignal = /child|pet|baby|urgent|asap|today|allergic/.test(normalized);

  const likelyPest = rodentSignal ? "Rodent activity" : termiteSignal ? "Possible termite activity" : bedBugSignal ? "Possible bed bug activity" : "General pest activity";

  return {
    likelyPest,
    confidence: rodentSignal || termiteSignal || bedBugSignal ? 0.62 : 0.48,
    severity: immediateSignal ? "high" : "moderate",
    urgency: immediateSignal ? "urgent" : "soon",
    recommendedService: "Inspection and targeted treatment plan",
    estimatedPriceRange: "$149-$499 after inspection",
    recommendedTimeline: immediateSignal ? "Same day or within 24 hours" : "Within 2-5 days",
    safetyConsiderations: [
      "Limit contact with active pest zones until technician review.",
      "Keep children and pets away from suspected activity areas.",
    ],
    followUpQuestions: [
      "Where and when have you noticed the strongest activity?",
      "Have you seen droppings, nesting, bites, or structural signs?",
      "Are children, pets, or high-risk occupants present in affected areas?",
    ],
    riskFactors: [
      "Unresolved activity may spread to additional rooms.",
      "Delays can increase treatment complexity and cost.",
    ],
    conversionLikelihood: immediateSignal ? "high" : "medium",
  };
}