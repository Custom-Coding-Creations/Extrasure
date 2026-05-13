import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-log";

export type AssessmentOverrideReason =
  | "incorrect_confidence"
  | "model_misclassification"
  | "edge_case"
  | "manual_review_required"
  | "other";

export interface AssessmentOverride {
  id: string;
  triageAssessmentId: string;
  previousConfidence: number;
  newConfidence: number;
  reason: AssessmentOverrideReason;
  notes?: string;
  overriddenBy: string;
  createdAt: Date;
}

export interface OverrideResult {
  success: boolean;
  override?: AssessmentOverride;
  error?: string;
}

/**
 * Override a triage assessment's confidence score
 */
export async function overrideTriageAssessment({
  assessmentId,
  newConfidence,
  reason,
  notes,
  actorId,
  actorRole,
}: {
  assessmentId: string;
  newConfidence: number;
  reason: AssessmentOverrideReason;
  notes?: string;
  actorId: string;
  actorRole: string;
}): Promise<OverrideResult> {
  try {
    // Fetch the existing assessment
    const assessment = await prisma.triageAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return { success: false, error: "Assessment not found" };
    }

    // Validate confidence score
    if (newConfidence < 0 || newConfidence > 1) {
      return { success: false, error: "Confidence score must be between 0 and 1" };
    }

    // Record the override in AssessmentOverride table
    const override = await prisma.assessmentOverride.create({
      data: {
        triageAssessmentId: assessmentId,
        previousConfidence: assessment.confidence,
        newConfidence,
        reason,
        notes,
        overriddenBy: actorId,
      },
    });

    // Update the assessment itself
    await prisma.triageAssessment.update({
      where: { id: assessmentId },
      data: {
        confidence: newConfidence,
      },
    });

    // Record audit event
    await recordAuditEvent({
      actor: actorId,
      role: actorRole,
      action: "triage_assessment_overridden",
      entity: "triage_assessment",
      entityId: assessmentId,
      before: { confidence: assessment.confidence },
      after: { confidence: newConfidence, reason, notes },
    });

    return {
      success: true,
      override: {
        id: override.id,
        triageAssessmentId: override.triageAssessmentId,
        previousConfidence: override.previousConfidence,
        newConfidence: override.newConfidence,
        reason: override.reason as AssessmentOverrideReason,
        notes: override.notes ?? undefined,
        overriddenBy: override.overriddenBy,
        createdAt: override.createdAt,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to override assessment";
    return { success: false, error: message };
  }
}

/**
 * Fetch recent assessment overrides
 */
export async function getRecentOverrides(limit: number = 20) {
  const overrides = await prisma.assessmentOverride.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return overrides.map((o) => ({
    id: o.id,
    triageAssessmentId: o.triageAssessmentId,
    previousConfidence: o.previousConfidence,
    newConfidence: o.newConfidence,
    reason: o.reason as AssessmentOverrideReason,
    notes: o.notes ?? undefined,
    overriddenBy: o.overriddenBy,
    createdAt: o.createdAt,
  }));
}

/**
 * Get override statistics for a date range
 */
export async function getOverrideStats(hoursBack: number = 24) {
  const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const overrides = await prisma.assessmentOverride.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
  });

  const reasonCounts: Record<string, number> = {};
  overrides.forEach((o) => {
    reasonCounts[o.reason] = (reasonCounts[o.reason] ?? 0) + 1;
  });

  return {
    totalOverrides: overrides.length,
    reasonBreakdown: reasonCounts,
        averageConfidenceChange: overrides.length
          ? overrides.reduce((sum: number, o) => sum + Math.abs(o.newConfidence - o.previousConfidence), 0) /
            overrides.length
      : 0,
  };
}

