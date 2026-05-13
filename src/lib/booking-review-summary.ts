type ReviewSlotInput = {
  start: string;
  technicianName?: string | null;
};

export type BookingReviewSummaryInput = {
  pestLabel: string;
  serviceName?: string | null;
  selectedSlot?: ReviewSlotInput | null;
  amount?: number | null;
  notes?: string;
  formatCurrency: (amount: number) => string;
  formatAppointment: (slot: ReviewSlotInput) => string;
};

export function buildBookingReviewSummary(input: BookingReviewSummaryInput) {
  return {
    pestConcern: input.pestLabel,
    protectionPlan: input.serviceName ?? "Not selected",
    appointment: input.selectedSlot ? input.formatAppointment(input.selectedSlot) : "Not selected",
    estimatedTotal: input.amount == null ? "$0" : input.formatCurrency(input.amount),
    notes: input.notes?.trim() ? input.notes : null,
  };
}
