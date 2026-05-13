export function buildBookingAiEventPayload(step: number, stepLabel: string) {
  return {
    step: step + 1,
    stepLabel,
  };
}

export function buildBookingTriageEventPayload(args: {
  step: number;
  stepLabel: string;
  completionQualityScore?: number;
  userConfidenceSelection?: "low" | "medium" | "high";
  followUpAccepted?: boolean;
  handoffSatisfaction?: "negative" | "neutral" | "positive";
}) {
  return {
    step: args.step + 1,
    stepLabel: args.stepLabel,
    lineageSource: "triage_assisted_chat" as const,
    completionQualityScore: args.completionQualityScore,
    userConfidenceSelection: args.userConfidenceSelection,
    followUpAccepted: args.followUpAccepted,
    handoffSatisfaction: args.handoffSatisfaction,
  };
}
