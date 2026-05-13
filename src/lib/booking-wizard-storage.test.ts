import {
  bookingWizardStorageKey,
  loadWizardState,
  normalizeWizardStep,
  resolveServiceId,
  saveWizardState,
} from "@/lib/booking-wizard-storage";

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("booking wizard storage", () => {
  it("saves and loads wizard state", () => {
    const storage = new MemoryStorage();

    saveWizardState(storage, {
      step: 3,
      selectedServiceId: "svc_2",
      city: "Syracuse",
      triageAssessmentId: "triage_1",
      triageLikelyPest: "Rodent activity",
      triageConfidence: 0.72,
    });

    const loaded = loadWizardState(storage);

    expect(loaded).toMatchObject({
      step: 3,
      selectedServiceId: "svc_2",
      city: "Syracuse",
      triageAssessmentId: "triage_1",
      triageLikelyPest: "Rodent activity",
      triageConfidence: 0.72,
    });
  });

  it("returns null for malformed json", () => {
    const storage = new MemoryStorage();
    storage.setItem(bookingWizardStorageKey, "not-json");

    expect(loadWizardState(storage)).toBeNull();
  });

  it("normalizes step bounds", () => {
    expect(normalizeWizardStep(-3, 4)).toBe(0);
    expect(normalizeWizardStep(99, 4)).toBe(4);
    expect(normalizeWizardStep(2.9, 4)).toBe(2);
    expect(normalizeWizardStep("2", 4)).toBe(0);
  });

  it("resolves service id against available options", () => {
    expect(resolveServiceId("svc_2", ["svc_1", "svc_2"], "svc_1")).toBe("svc_2");
    expect(resolveServiceId("svc_missing", ["svc_1", "svc_2"], "svc_1")).toBe("svc_1");
    expect(resolveServiceId(undefined, ["svc_1", "svc_2"], "svc_1")).toBe("svc_1");
  });
});
