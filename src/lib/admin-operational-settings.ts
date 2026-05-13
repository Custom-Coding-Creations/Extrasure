import { prisma } from "@/lib/prisma";
import { getTriageHumanReviewConfidenceThreshold, isTriageEnabled } from "@/lib/triage-runtime";

export type OperationalState = {
  triageKillSwitchDisabled: boolean;
  triageHumanReviewThreshold: number;
  updatedAt: Date;
  updatedBy: string | null;
};

let settingsCache: OperationalState | null = null;
let cacheTtl = 0;

const CACHE_DURATION_MS = 60000; // 1 minute

export async function getOperationalSettings(): Promise<OperationalState> {
  // Use cache if still valid
  if (settingsCache && cacheTtl > Date.now() - CACHE_DURATION_MS) {
    return settingsCache;
  }

  try {
    const settings = await prisma.operationalSettings.findUnique({
      where: { id: "singleton" },
    });

    if (settings) {
      settingsCache = {
        triageKillSwitchDisabled: settings.triageKillSwitchDisabled,
        triageHumanReviewThreshold: settings.triageHumanReviewThreshold,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
      };
      cacheTtl = Date.now();
      return settingsCache;
    }
  } catch (error) {
    console.error("Failed to fetch operational settings:", error);
  }

  // Fallback to environment variables
  return {
    triageKillSwitchDisabled: !isTriageEnabled(),
    triageHumanReviewThreshold: getTriageHumanReviewConfidenceThreshold(),
    updatedAt: new Date(),
    updatedBy: null,
  };
}

export async function setTriageKillSwitch(disabled: boolean, actor: string): Promise<OperationalState> {
  try {
    const settings = await prisma.operationalSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        triageKillSwitchDisabled: disabled,
        triageHumanReviewThreshold: getTriageHumanReviewConfidenceThreshold(),
        updatedBy: actor,
      },
      update: {
        triageKillSwitchDisabled: disabled,
        updatedBy: actor,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    settingsCache = null;
    cacheTtl = 0;

    return {
      triageKillSwitchDisabled: settings.triageKillSwitchDisabled,
      triageHumanReviewThreshold: settings.triageHumanReviewThreshold,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    };
  } catch (error) {
    console.error("Failed to update triage kill switch:", error);
    throw error;
  }
}

export async function setTriageHumanReviewThreshold(
  threshold: number,
  actor: string,
): Promise<OperationalState> {
  const clamped = Math.max(0, Math.min(1, threshold));

  try {
    const settings = await prisma.operationalSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        triageKillSwitchDisabled: !isTriageEnabled(),
        triageHumanReviewThreshold: clamped,
        updatedBy: actor,
      },
      update: {
        triageHumanReviewThreshold: clamped,
        updatedBy: actor,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    settingsCache = null;
    cacheTtl = 0;

    return {
      triageKillSwitchDisabled: settings.triageKillSwitchDisabled,
      triageHumanReviewThreshold: settings.triageHumanReviewThreshold,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    };
  } catch (error) {
    console.error("Failed to update triage human review threshold:", error);
    throw error;
  }
}
