import { prisma } from "@/lib/prisma";

export type TriageHealthMetrics = {
  totalAssessments: number;
  autoApprovedCount: number;
  humanReviewFlaggedCount: number;
  autoApproveRate: number;
  averageConfidence: number;
  assessmentsByConfidenceBucket: Record<string, number>;
  timeWindow: {
    startDate: Date;
    endDate: Date;
    hoursSpanned: number;
  };
};

export type AnomalyDetection = {
  ok: true;
  hasAnomalies: boolean;
  anomalies: {
    type: "low_auto_approve_rate" | "high_manual_override_rate" | "low_confidence_trend" | "high_confidence_drift";
    severity: "warning" | "critical";
    message: string;
    value: number;
    threshold: number;
  }[];
  metrics: TriageHealthMetrics;
};

/**
 * Compute triage assessment metrics for anomaly detection.
 * Looks at recent assessments (last 24 hours by default).
 */
export async function computeTriageHealthMetrics(hoursBack: number = 24): Promise<TriageHealthMetrics> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const assessments = await prisma.triageAssessment.findMany({
    where: {
      createdAt: {
        gte: cutoff,
      },
    },
    select: {
      id: true,
      confidenceScore: true,
      requiresHumanReview: true,
    },
    take: 1000,
  });

  const autoApprovedCount = assessments.filter((a) => !a.requiresHumanReview).length;
  const humanReviewFlaggedCount = assessments.filter((a) => a.requiresHumanReview).length;
  const totalAssessments = assessments.length;

  const autoApproveRate = totalAssessments > 0 ? autoApprovedCount / totalAssessments : 0;
  const averageConfidence = totalAssessments > 0 ? assessments.reduce((sum, a) => sum + a.confidenceScore, 0) / totalAssessments : 0;

  // Bucket confidence scores for trend analysis
  const confidentBuckets: Record<string, number> = {
    "0.0-0.25": 0,
    "0.25-0.50": 0,
    "0.50-0.75": 0,
    "0.75-0.90": 0,
    "0.90-1.00": 0,
  };

  assessments.forEach((a) => {
    const score = a.confidenceScore;
    if (score < 0.25) confidentBuckets["0.0-0.25"]++;
    else if (score < 0.5) confidentBuckets["0.25-0.50"]++;
    else if (score < 0.75) confidentBuckets["0.50-0.75"]++;
    else if (score < 0.9) confidentBuckets["0.75-0.90"]++;
    else confidentBuckets["0.90-1.00"]++;
  });

  const now = new Date();
  const hoursSpanned = (now.getTime() - cutoff.getTime()) / (60 * 60 * 1000);

  return {
    totalAssessments,
    autoApprovedCount,
    humanReviewFlaggedCount,
    autoApproveRate,
    averageConfidence,
    assessmentsByConfidenceBucket: confidentBuckets,
    timeWindow: {
      startDate: cutoff,
      endDate: now,
      hoursSpanned,
    },
  };
}

/**
 * Detect anomalies in triage assessment patterns.
 * Returns warnings/critical alerts if metrics deviate from expected ranges.
 */
export async function detectTriageAnomalies(hoursBack: number = 24): Promise<AnomalyDetection> {
  const metrics = await computeTriageHealthMetrics(hoursBack);
  const anomalies: AnomalyDetection["anomalies"] = [];

  // Anomaly 1: Very low auto-approve rate (< 10%)
  // Might indicate threshold too strict or model degradation
  if (metrics.totalAssessments > 10 && metrics.autoApproveRate < 0.1) {
    anomalies.push({
      type: "low_auto_approve_rate",
      severity: "warning",
      message: "Auto-approve rate is very low (< 10%). Check if confidence threshold is too strict or model has regressed.",
      value: Math.round(metrics.autoApproveRate * 100),
      threshold: 10,
    });
  }

  // Anomaly 2: Very high manual override rate (> 80%)
  // Indicates threshold too lenient or model is unreliable
  if (metrics.totalAssessments > 10 && metrics.autoApproveRate > 0.8) {
    anomalies.push({
      type: "high_manual_override_rate",
      severity: "critical",
      message: "Auto-approve rate is very high (> 80%). Model may be over-confident; consider raising threshold.",
      value: Math.round(metrics.autoApproveRate * 100),
      threshold: 80,
    });
  }

  // Anomaly 3: Low average confidence (< 0.5)
  // Model is not confident in assessments
  if (metrics.totalAssessments > 10 && metrics.averageConfidence < 0.5) {
    anomalies.push({
      type: "low_confidence_trend",
      severity: "warning",
      message: "Average confidence score is low (< 0.5). Assessments may be unreliable.",
      value: Math.round(metrics.averageConfidence * 100),
      threshold: 50,
    });
  }

  // Anomaly 4: Very high confidence drift (> 0.95)
  // Model is overconfident, risky
  if (metrics.totalAssessments > 10 && metrics.averageConfidence > 0.95) {
    anomalies.push({
      type: "high_confidence_drift",
      severity: "critical",
      message: "Average confidence is very high (> 0.95). Model may be overconfident.",
      value: Math.round(metrics.averageConfidence * 100),
      threshold: 95,
    });
  }

  return {
    ok: true,
    hasAnomalies: anomalies.length > 0,
    anomalies,
    metrics,
  };
}
