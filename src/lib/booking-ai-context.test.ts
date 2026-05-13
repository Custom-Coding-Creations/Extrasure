import { buildBookingAiContext } from "@/lib/booking-ai-context";

describe("booking ai context", () => {
  it("builds booking wizard context payload", () => {
    expect(
      buildBookingAiContext({
        step: 2,
        stepLabel: "Appointment",
        city: "Syracuse",
        propertyAddress: "123 Main St",
      }),
    ).toEqual({
      currentPage: "booking_wizard",
      pageSummary: "Step 3 - Appointment",
      city: "Syracuse",
      propertyAddress: "123 Main St",
      triageAssessmentId: undefined,
      triageLikelyPest: undefined,
      triageConfidence: undefined,
    });
  });

  it("omits blank optional values", () => {
    expect(
      buildBookingAiContext({
        step: 0,
        stepLabel: "Pest details",
        city: "",
        propertyAddress: "",
      }),
    ).toEqual({
      currentPage: "booking_wizard",
      pageSummary: "Step 1 - Pest details",
      city: undefined,
      propertyAddress: undefined,
      triageAssessmentId: undefined,
      triageLikelyPest: undefined,
      triageConfidence: undefined,
    });
  });

  it("includes optional triage metadata", () => {
    expect(
      buildBookingAiContext({
        step: 1,
        stepLabel: "Protection plan",
        city: "Syracuse",
        triageAssessmentId: "triage_123",
        triageLikelyPest: "Rodent activity",
        triageConfidence: 0.81234,
      }),
    ).toEqual({
      currentPage: "booking_wizard",
      pageSummary: "Step 2 - Protection plan",
      city: "Syracuse",
      propertyAddress: undefined,
      triageAssessmentId: "triage_123",
      triageLikelyPest: "Rodent activity",
      triageConfidence: 0.812,
    });
  });
});
