import type { AvailableSlot } from "@/components/availability-picker";

export const bookingWizardStorageKey = "booking_wizard_v2";

export type StoredWizardState = {
  step?: number;
  selectedPestId?: string;
  selectedServiceId?: string;
  selectedSlot?: AvailableSlot | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  stateProvince?: string;
  notes?: string;
  triagePrompt?: string;
  triageAssessmentId?: string;
  triageLikelyPest?: string;
  triageConfidence?: number;
  triagePhotoUrls?: string[];
};

export function loadWizardState(storage: Pick<Storage, "getItem">, key = bookingWizardStorageKey): StoredWizardState | null {
  const raw = storage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredWizardState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWizardState(
  storage: Pick<Storage, "setItem">,
  state: StoredWizardState,
  key = bookingWizardStorageKey,
) {
  storage.setItem(key, JSON.stringify(state));
}

export function normalizeWizardStep(step: unknown, maxStep: number) {
  if (typeof step !== "number" || Number.isNaN(step)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(step), 0), maxStep);
}

export function resolveServiceId(storedServiceId: unknown, availableServiceIds: string[], fallbackServiceId: string) {
  if (typeof storedServiceId !== "string") {
    return fallbackServiceId;
  }

  if (availableServiceIds.includes(storedServiceId)) {
    return storedServiceId;
  }

  return fallbackServiceId;
}
