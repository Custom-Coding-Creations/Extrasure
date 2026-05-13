import { trackEvent, trackTriageEvent } from "@/lib/analytics";

describe("trackEvent", () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      delete (global as typeof global & { window?: Window }).window;
    }
  });

  it("pushes events to dataLayer and gtag when available", () => {
    const gtag = jest.fn();

    global.window = {
      dataLayer: [],
      gtag,
    } as Window;

    trackEvent("booking_ai_prompt_sent", { step: 2, ready: true });

    expect(global.window.dataLayer).toEqual([
      {
        event: "booking_ai_prompt_sent",
        step: 2,
        ready: true,
      },
    ]);
    expect(gtag).toHaveBeenCalledWith("event", "booking_ai_prompt_sent", { step: 2, ready: true });
  });

  it("is a no-op when window is unavailable", () => {
    delete (global as typeof global & { window?: Window }).window;

    expect(() => trackEvent("booking_ai_prompt_failed", { step: 3 })).not.toThrow();
  });

  it("prefixes triage events and applies default lineage", () => {
    const gtag = jest.fn();

    global.window = {
      dataLayer: [],
      gtag,
    } as Window;

    trackTriageEvent("completed", { completionQualityScore: 0.8 });

    expect(global.window.dataLayer).toEqual([
      {
        event: "triage_completed",
        lineageSource: "triage_engine",
        completionQualityScore: 0.8,
      },
    ]);
    expect(gtag).toHaveBeenCalledWith("event", "triage_completed", {
      lineageSource: "triage_engine",
      completionQualityScore: 0.8,
    });
  });
});
