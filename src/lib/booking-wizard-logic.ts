export type WizardProgressInput = {
  selectedServiceId: string;
  hasSelectedSlot: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  stateProvince: string;
};

export function canProceedStep(step: number, input: WizardProgressInput) {
  if (step === 0) {
    return true;
  }

  if (step === 1) {
    return Boolean(input.selectedServiceId);
  }

  if (step === 2) {
    return input.hasSelectedSlot;
  }

  if (step === 3) {
    return Boolean(
      input.contactName &&
      input.contactEmail &&
      input.contactPhone &&
      input.addressLine1 &&
      input.city &&
      input.postalCode &&
      input.stateProvince,
    );
  }

  return step === 4;
}

export function nextWizardStep(currentStep: number, maxStep: number) {
  return Math.min(currentStep + 1, maxStep);
}

export function previousWizardStep(currentStep: number) {
  return Math.max(currentStep - 1, 0);
}
