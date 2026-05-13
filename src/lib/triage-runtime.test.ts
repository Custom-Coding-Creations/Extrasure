import {
  getTriageHumanReviewConfidenceThreshold,
  getTriagePhotoRetentionDays,
  getTriageRecordRetentionDays,
  isTriageEnabled,
  isTriageUiEnabled,
} from "@/lib/triage-runtime";

describe("triage-runtime", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("enables triage by default", () => {
    delete process.env.AI_TRIAGE_ENABLED;
    expect(isTriageEnabled()).toBe(true);
  });

  it("disables triage on false-like flags", () => {
    process.env.AI_TRIAGE_ENABLED = "false";
    expect(isTriageEnabled()).toBe(false);
  });

  it("prefers explicit public UI flag", () => {
    process.env.AI_TRIAGE_ENABLED = "true";
    process.env.NEXT_PUBLIC_AI_TRIAGE_ENABLED = "off";
    expect(isTriageUiEnabled()).toBe(false);
  });

  it("clamps human review threshold", () => {
    process.env.AI_TRIAGE_HUMAN_REVIEW_THRESHOLD = "2";
    expect(getTriageHumanReviewConfidenceThreshold()).toBe(1);
    process.env.AI_TRIAGE_HUMAN_REVIEW_THRESHOLD = "-2";
    expect(getTriageHumanReviewConfidenceThreshold()).toBe(0);
  });

  it("uses fallback retention windows when env invalid", () => {
    process.env.AI_TRIAGE_PHOTO_RETENTION_DAYS = "0";
    process.env.AI_TRIAGE_RECORD_RETENTION_DAYS = "nan";
    expect(getTriagePhotoRetentionDays()).toBe(30);
    expect(getTriageRecordRetentionDays()).toBe(120);
  });
});