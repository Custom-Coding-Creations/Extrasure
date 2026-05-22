import { getAuditEvents, parseAuditSnapshot, recordAuditEvent } from "@/lib/audit-log";

const ASSISTANT_MODE_ENTITY = "admin_manual_assistant_mode";
const DEFAULT_LOOKBACK_HOURS = 24;

export type ManualAssistantModeTimelinePoint = {
  hourStartIso: string;
  total: number;
  modeCounts: Record<string, number>;
};

function sumCounts(modeCounts: Record<string, number>) {
  return Object.values(modeCounts).reduce((total, value) => total + value, 0);
}

export async function getAdminManualAssistantModeCounts({
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
}: {
  lookbackHours?: number;
} = {}) {
  const fromDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const events = await getAuditEvents({
    entity: ASSISTANT_MODE_ENTITY,
    action: "manual_assistant_mode_recorded",
    fromDate,
  }, 1000);

  const counts: Record<string, number> = {};

  for (const event of events) {
    const parsed = parseAuditSnapshot(event.after) as { mode?: string } | null;
    if (!parsed?.mode) {
      continue;
    }

    counts[parsed.mode] = (counts[parsed.mode] ?? 0) + 1;
  }

  return counts;
}

export async function getAdminManualAssistantModeTimeline({
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
}: {
  lookbackHours?: number;
} = {}) {
  const now = new Date();
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  const cappedLookback = Math.max(1, Math.min(lookbackHours, 168));
  const fromDate = new Date(currentHour.getTime() - (cappedLookback - 1) * 60 * 60 * 1000);

  const events = await getAuditEvents({
    entity: ASSISTANT_MODE_ENTITY,
    action: "manual_assistant_mode_recorded",
    fromDate,
  }, 5000);

  const buckets = new Map<string, ManualAssistantModeTimelinePoint>();

  for (let index = 0; index < cappedLookback; index += 1) {
    const bucketHour = new Date(fromDate.getTime() + index * 60 * 60 * 1000);
    const key = bucketHour.toISOString();
    buckets.set(key, {
      hourStartIso: key,
      total: 0,
      modeCounts: {},
    });
  }

  for (const event of events) {
    const parsed = parseAuditSnapshot(event.after) as { mode?: string } | null;
    const mode = parsed?.mode;
    if (!mode) {
      continue;
    }

    const eventHour = new Date(event.timestamp);
    eventHour.setMinutes(0, 0, 0);
    const bucketKey = eventHour.toISOString();
    const bucket = buckets.get(bucketKey);

    if (!bucket) {
      continue;
    }

    bucket.total += 1;
    bucket.modeCounts[mode] = (bucket.modeCounts[mode] ?? 0) + 1;
  }

  return Array.from(buckets.values());
}

export async function recordAdminManualAssistantResponseMode(mode: string) {
  await recordAuditEvent({
    actor: "system",
    role: "system",
    action: "manual_assistant_mode_recorded",
    entity: ASSISTANT_MODE_ENTITY,
    entityId: mode,
    after: {
      mode,
      timestamp: new Date().toISOString(),
    },
  });

  const modeCounts = await getAdminManualAssistantModeCounts();

  return {
    mode,
    modeCount: modeCounts[mode] ?? 0,
    totalResponses: sumCounts(modeCounts),
    modeCounts,
  };
}
