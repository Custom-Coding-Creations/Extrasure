export type BookingAiContextInput = {
  step: number;
  stepLabel: string;
  city: string;
  propertyAddress?: string;
};

export function buildBookingAiContext(input: BookingAiContextInput) {
  return {
    currentPage: "booking_wizard",
    pageSummary: `Step ${input.step + 1} - ${input.stepLabel}`,
    city: input.city || undefined,
    propertyAddress: input.propertyAddress || undefined,
  };
}
