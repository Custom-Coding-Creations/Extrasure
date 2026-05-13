import { isBookingSubmitReady, type BookingSubmitReadinessInput } from "@/lib/booking-submit-readiness";

function sampleInput(): BookingSubmitReadinessInput {
  return {
    selectedServiceId: "svc_1",
    hasSelectedSlot: true,
    contactName: "Jordan Smith",
    contactEmail: "jordan@example.com",
    contactPhone: "555-555-1111",
    addressLine1: "123 Main St",
    city: "Syracuse",
    postalCode: "13202",
    stateProvince: "NY",
  };
}

describe("booking submit readiness", () => {
  it("returns true when booking has required checkout inputs", () => {
    expect(isBookingSubmitReady(sampleInput())).toBe(true);
  });

  it("returns false when any required field is missing", () => {
    expect(isBookingSubmitReady({ ...sampleInput(), hasSelectedSlot: false })).toBe(false);
    expect(isBookingSubmitReady({ ...sampleInput(), selectedServiceId: "" })).toBe(false);
    expect(isBookingSubmitReady({ ...sampleInput(), contactEmail: "" })).toBe(false);
    expect(isBookingSubmitReady({ ...sampleInput(), stateProvince: "" })).toBe(false);
  });
});
