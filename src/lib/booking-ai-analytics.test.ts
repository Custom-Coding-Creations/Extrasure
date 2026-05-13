import { buildBookingAiEventPayload } from "@/lib/booking-ai-analytics";

describe("booking ai analytics helper", () => {
  it("converts zero-based wizard state into analytics payload", () => {
    expect(buildBookingAiEventPayload(0, "Pest details")).toEqual({
      step: 1,
      stepLabel: "Pest details",
    });
  });

  it("preserves later step labels", () => {
    expect(buildBookingAiEventPayload(4, "Review")).toEqual({
      step: 5,
      stepLabel: "Review",
    });
  });
});
