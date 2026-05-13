import type { WizardProgressInput } from "@/lib/booking-wizard-logic";

export type BookingSubmitReadinessInput = WizardProgressInput;

export function isBookingSubmitReady(input: BookingSubmitReadinessInput) {
  return Boolean(
    input.selectedServiceId &&
    input.hasSelectedSlot &&
    input.contactName &&
    input.contactEmail &&
    input.contactPhone &&
    input.addressLine1 &&
    input.city &&
    input.postalCode &&
    input.stateProvince,
  );
}
