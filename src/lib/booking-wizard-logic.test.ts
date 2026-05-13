import {
  canProceedStep,
  nextWizardStep,
  previousWizardStep,
  type WizardProgressInput,
} from "@/lib/booking-wizard-logic";

function baseInput(): WizardProgressInput {
  return {
    selectedServiceId: "svc_1",
    hasSelectedSlot: true,
    contactName: "Alex Smith",
    contactEmail: "alex@example.com",
    contactPhone: "555-555-1212",
    addressLine1: "123 Main St",
    city: "Syracuse",
    postalCode: "13202",
    stateProvince: "NY",
  };
}

describe("booking wizard logic", () => {
  it("allows progression rules per step", () => {
    expect(canProceedStep(0, baseInput())).toBe(true);

    expect(canProceedStep(1, { ...baseInput(), selectedServiceId: "" })).toBe(false);
    expect(canProceedStep(1, baseInput())).toBe(true);

    expect(canProceedStep(2, { ...baseInput(), hasSelectedSlot: false })).toBe(false);
    expect(canProceedStep(2, baseInput())).toBe(true);

    expect(canProceedStep(3, { ...baseInput(), contactEmail: "" })).toBe(false);
    expect(canProceedStep(3, baseInput())).toBe(true);

    expect(canProceedStep(4, baseInput())).toBe(true);
    expect(canProceedStep(6, baseInput())).toBe(false);
  });

  it("clamps next and previous step navigation", () => {
    expect(nextWizardStep(1, 4)).toBe(2);
    expect(nextWizardStep(4, 4)).toBe(4);
    expect(previousWizardStep(3)).toBe(2);
    expect(previousWizardStep(0)).toBe(0);
  });
});
