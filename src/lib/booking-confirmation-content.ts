type BookingConfirmationContentInput = {
  confirmation: {
    itemName?: string | null;
    preferredDate: string;
    preferredWindow: string;
    paid: boolean;
    bookingId: string;
  } | null;
  formatDate: (date: string) => string;
};

export function buildBookingConfirmationContent(input: BookingConfirmationContentInput) {
  return {
    heroMessage:
      "Thanks for choosing ExtraSure. Our team will review your request, finalize dispatch details, and send confirmation updates.",
    emptyStateMessage:
      "We could not find your booking details yet. If checkout just completed, refresh in a moment.",
    summary: input.confirmation
      ? {
          service: input.confirmation.itemName ?? "Requested service",
          preferredWindow: `${input.formatDate(input.confirmation.preferredDate)} · ${input.confirmation.preferredWindow}`,
          status: input.confirmation.paid ? "Payment received" : "Payment processing",
          reference: input.confirmation.bookingId,
        }
      : null,
    nextSteps: [
      "Dispatcher verifies route and technician match.",
      "You receive confirmation and prep instructions.",
      "Licensed technician arrives in your selected window.",
    ],
  };
}
