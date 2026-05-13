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
    });
  });
});
