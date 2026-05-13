import { buildBookingConfirmationContent } from "@/lib/booking-confirmation-content";

describe("booking confirmation content", () => {
  const formatDate = (date: string) => `formatted:${date}`;

  it("builds summary content for a paid booking", () => {
    expect(
      buildBookingConfirmationContent({
        confirmation: {
          itemName: "Quarterly Shield",
          preferredDate: "2026-05-13",
          preferredWindow: "Afternoon",
          paid: true,
          bookingId: "book_123",
        },
        formatDate,
      }),
    ).toEqual({
      heroMessage:
        "Thanks for choosing ExtraSure. Our team will review your request, finalize dispatch details, and send confirmation updates.",
      emptyStateMessage:
        "We could not find your booking details yet. If checkout just completed, refresh in a moment.",
      summary: {
        service: "Quarterly Shield",
        preferredWindow: "formatted:2026-05-13 · Afternoon",
        status: "Payment received",
        reference: "book_123",
      },
      nextSteps: [
        "Dispatcher verifies route and technician match.",
        "You receive confirmation and prep instructions.",
        "Licensed technician arrives in your selected window.",
      ],
    });
  });

  it("returns fallback content when confirmation is unavailable", () => {
    expect(
      buildBookingConfirmationContent({
        confirmation: null,
        formatDate,
      }),
    ).toMatchObject({
      summary: null,
      emptyStateMessage:
        "We could not find your booking details yet. If checkout just completed, refresh in a moment.",
    });
  });
});
