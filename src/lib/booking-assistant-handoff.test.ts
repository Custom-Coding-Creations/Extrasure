import {
  bookingAiHandoffStorageKey,
  clearBookingAiHandoff,
  loadBookingAiHandoff,
  saveBookingAiHandoff,
} from "@/lib/booking-assistant-handoff";

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe("booking assistant handoff", () => {
  it("saves and loads valid handoff payload", () => {
    const storage = new MemoryStorage();

    saveBookingAiHandoff(storage, {
      prompt: "Which plan is best for ant activity?",
      context: {
        currentPage: "booking_wizard",
        pageSummary: "Step 2 - Protection plan",
      },
    });

    const loaded = loadBookingAiHandoff(storage);

    expect(loaded).toEqual({
      prompt: "Which plan is best for ant activity?",
      context: {
        currentPage: "booking_wizard",
        pageSummary: "Step 2 - Protection plan",
      },
    });
  });

  it("returns null for invalid payload", () => {
    const storage = new MemoryStorage();
    storage.setItem(bookingAiHandoffStorageKey, JSON.stringify({ context: { currentPage: "booking" } }));

    expect(loadBookingAiHandoff(storage)).toBeNull();
  });

  it("clears saved payload", () => {
    const storage = new MemoryStorage();

    saveBookingAiHandoff(storage, {
      prompt: "Help me choose a time slot",
    });

    clearBookingAiHandoff(storage);

    expect(loadBookingAiHandoff(storage)).toBeNull();
  });
});
