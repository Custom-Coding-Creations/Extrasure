import {
  buildContactHiddenFields,
  buildCoreHiddenFields,
  type BookingSubmissionInput,
} from "@/lib/booking-submission-payload";

function sampleInput(): BookingSubmissionInput {
  return {
    serviceCatalogItemId: "svc_1",
    preferredDate: "2026-05-13",
    preferredWindow: "Afternoon",
    preferredDateTime: "2026-05-13T16:00:00.000Z",
    preferredTechnicianId: "tech_1",
    notes: "Gate code 1234",
    contactName: "Jordan Smith",
    contactEmail: "jordan@example.com",
    contactPhone: "555-555-1111",
    addressLine1: "123 Main St",
    addressLine2: "Apt 2",
    city: "Syracuse",
    postalCode: "13202",
    stateProvince: "NY",
  };
}

describe("booking submission payload helpers", () => {
  it("builds core hidden fields", () => {
    const input = sampleInput();

    expect(buildCoreHiddenFields(input)).toEqual({
      serviceCatalogItemId: "svc_1",
      preferredDate: "2026-05-13",
      preferredWindow: "Afternoon",
      preferredDateTime: "2026-05-13T16:00:00.000Z",
      preferredTechnicianId: "tech_1",
      notes: "Gate code 1234",
    });
  });

  it("builds contact hidden fields", () => {
    const input = sampleInput();

    expect(buildContactHiddenFields(input)).toEqual({
      contactName: "Jordan Smith",
      contactEmail: "jordan@example.com",
      contactPhone: "555-555-1111",
      addressLine1: "123 Main St",
      addressLine2: "Apt 2",
      city: "Syracuse",
      postalCode: "13202",
      stateProvince: "NY",
    });
  });
});
