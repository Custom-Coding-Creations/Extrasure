export type BookingAssistantContext = {
  currentPage?: string;
  pageSummary?: string;
  customerName?: string;
  activePlan?: string;
  lifecycle?: string;
  city?: string;
  lastServiceDate?: string;
  propertyAddress?: string;
};

export type BookingAiHandoff = {
  prompt: string;
  context?: BookingAssistantContext;
};

export const bookingAiHandoffStorageKey = "booking_ai_handoff_v1";

export function saveBookingAiHandoff(storage: Pick<Storage, "setItem">, handoff: BookingAiHandoff) {
  storage.setItem(bookingAiHandoffStorageKey, JSON.stringify(handoff));
}

export function loadBookingAiHandoff(storage: Pick<Storage, "getItem">): BookingAiHandoff | null {
  const raw = storage.getItem(bookingAiHandoffStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as BookingAiHandoff;

    if (!parsed?.prompt || typeof parsed.prompt !== "string") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearBookingAiHandoff(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(bookingAiHandoffStorageKey);
}
