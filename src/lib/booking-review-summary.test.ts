import { buildBookingReviewSummary } from "@/lib/booking-review-summary";

describe("booking review summary", () => {
  const formatCurrency = (amount: number) => `$${amount}`;
  const formatAppointment = (slot: { start: string; technicianName?: string | null }) => {
    return `${slot.start} with ${slot.technicianName || "next available technician"}`;
  };

  it("builds review summary values for a completed booking", () => {
    expect(
      buildBookingReviewSummary({
        pestLabel: "Rodents",
        serviceName: "Quarterly Shield",
        selectedSlot: {
          start: "2026-05-13T16:00:00.000Z",
          technicianName: "Alex",
        },
        amount: 149,
        notes: "Use side gate",
        formatCurrency,
        formatAppointment,
      }),
    ).toEqual({
      pestConcern: "Rodents",
      protectionPlan: "Quarterly Shield",
      appointment: "2026-05-13T16:00:00.000Z with Alex",
      estimatedTotal: "$149",
      notes: "Use side gate",
    });
  });

  it("falls back when booking details are incomplete", () => {
    expect(
      buildBookingReviewSummary({
        pestLabel: "Ants",
        serviceName: null,
        selectedSlot: null,
        amount: null,
        notes: "   ",
        formatCurrency,
        formatAppointment,
      }),
    ).toEqual({
      pestConcern: "Ants",
      protectionPlan: "Not selected",
      appointment: "Not selected",
      estimatedTotal: "$0",
      notes: null,
    });
  });
});
