export type BookingAiContextInput = {
  step: number;
  stepLabel: string;
  city: string;
  propertyAddress?: string;
  triageAssessmentId?: string;
  triageLikelyPest?: string;
  triageConfidence?: number;
};

export function buildBookingAiContext(input: BookingAiContextInput) {
  return {
    currentPage: "booking_wizard",
    pageSummary: `Step ${input.step + 1} - ${input.stepLabel}`,
    city: input.city || undefined,
    propertyAddress: input.propertyAddress || undefined,
    triageAssessmentId: input.triageAssessmentId || undefined,
    triageLikelyPest: input.triageLikelyPest || undefined,
    triageConfidence: typeof input.triageConfidence === "number" ? Number(input.triageConfidence.toFixed(3)) : undefined,
  };
}
