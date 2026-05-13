function isDisabledFlag(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off" || normalized === "disabled";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseThreshold(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, parsed));
}

export function isTriageEnabled() {
  return !isDisabledFlag(process.env.AI_TRIAGE_ENABLED);
}

export function isTriageUiEnabled() {
  return !isDisabledFlag(process.env.NEXT_PUBLIC_AI_TRIAGE_ENABLED ?? process.env.AI_TRIAGE_ENABLED);
}

export function getTriageHumanReviewConfidenceThreshold() {
  return parseThreshold(process.env.AI_TRIAGE_HUMAN_REVIEW_THRESHOLD, 0.7);
}

export function getTriagePhotoRetentionDays() {
  return parsePositiveInt(process.env.AI_TRIAGE_PHOTO_RETENTION_DAYS, 30);
}

export function getTriageRecordRetentionDays() {
  return parsePositiveInt(process.env.AI_TRIAGE_RECORD_RETENTION_DAYS, 120);
}

export function getTriageRuntimeSnapshot() {
  return {
    triageEnabled: isTriageEnabled(),
    triageUiEnabled: isTriageUiEnabled(),
    humanReviewThreshold: getTriageHumanReviewConfidenceThreshold(),
    photoRetentionDays: getTriagePhotoRetentionDays(),
    recordRetentionDays: getTriageRecordRetentionDays(),
  };
}

export function logTriageOperationalEvent(event: string, details: Record<string, unknown>) {
  console.info("[triage-ops]", JSON.stringify({ event, ...details, timestamp: new Date().toISOString() }));
}