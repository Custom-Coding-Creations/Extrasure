import { computeTriageHealthMetrics, detectTriageAnomalies } from "@/lib/triage-anomaly-detection";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    triageAssessment: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    triageAssessment: {
      findMany: jest.Mock;
    };
  };
};

describe("triage anomaly detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("computeTriageHealthMetrics", () => {
    it("returns metrics for recent assessments", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([
        { id: "1", confidence: 0.9, needsFollowUp: false },
        { id: "2", confidence: 0.3, needsFollowUp: true },
        { id: "3", confidence: 0.8, needsFollowUp: false },
      ]);

      const metrics = await computeTriageHealthMetrics(24);

      expect(metrics.totalAssessments).toBe(3);
      expect(metrics.autoApprovedCount).toBe(2);
      expect(metrics.humanReviewFlaggedCount).toBe(1);
      expect(metrics.autoApproveRate).toBeCloseTo(0.667, 2);
      expect(metrics.averageConfidence).toBeCloseTo(0.7, 1);
    });

    it("handles empty assessment set", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([]);

      const metrics = await computeTriageHealthMetrics(24);

      expect(metrics.totalAssessments).toBe(0);
      expect(metrics.autoApproveRate).toBe(0);
      expect(metrics.averageConfidence).toBe(0);
    });

    it("buckets confidence scores correctly", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([
        { id: "1", confidence: 0.1, needsFollowUp: true },
        { id: "2", confidence: 0.4, needsFollowUp: true },
        { id: "3", confidence: 0.6, needsFollowUp: false },
        { id: "4", confidence: 0.8, needsFollowUp: false },
        { id: "5", confidence: 0.95, needsFollowUp: false },
      ]);

      const metrics = await computeTriageHealthMetrics(24);

      expect(metrics.assessmentsByConfidenceBucket["0.0-0.25"]).toBe(1);
      expect(metrics.assessmentsByConfidenceBucket["0.25-0.50"]).toBe(1);
      expect(metrics.assessmentsByConfidenceBucket["0.50-0.75"]).toBe(1);
      expect(metrics.assessmentsByConfidenceBucket["0.75-0.90"]).toBe(1);
      expect(metrics.assessmentsByConfidenceBucket["0.90-1.00"]).toBe(1);
    });
  });

  describe("detectTriageAnomalies", () => {
    it("detects low auto-approve rate", async () => {
      const assessments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        confidence: 0.7,
        needsFollowUp: i < 19, // Only 1 auto-approved (5%)
      }));
      prisma.triageAssessment.findMany.mockResolvedValue(assessments);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          type: "low_auto_approve_rate",
          severity: "warning",
        }),
      );
    });

    it("detects high auto-approve rate", async () => {
      const assessments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        confidence: 0.9,
        needsFollowUp: i < 2, // 18 auto-approved (90%)
      }));
      prisma.triageAssessment.findMany.mockResolvedValue(assessments);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          type: "high_manual_override_rate",
          severity: "critical",
        }),
      );
    });

    it("detects low confidence trend", async () => {
      const assessments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        confidence: 0.3,
        needsFollowUp: true,
      }));
      prisma.triageAssessment.findMany.mockResolvedValue(assessments);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          type: "low_confidence_trend",
          severity: "warning",
        }),
      );
    });

    it("detects high confidence drift", async () => {
      const assessments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        confidence: 0.97,
        needsFollowUp: false,
      }));
      prisma.triageAssessment.findMany.mockResolvedValue(assessments);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies).toContainEqual(
        expect.objectContaining({
          type: "high_confidence_drift",
          severity: "critical",
        }),
      );
    });

    it("returns no anomalies when healthy", async () => {
      const assessments = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        confidence: 0.7,
        needsFollowUp: i < 8, // 60% auto-approve, 70% average confidence
      }));
      prisma.triageAssessment.findMany.mockResolvedValue(assessments);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(false);
      expect(result.anomalies).toHaveLength(0);
    });

    it("skips anomaly detection with too few assessments", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([
        { id: "1", confidence: 0.1, needsFollowUp: true },
      ]);

      const result = await detectTriageAnomalies(24);

      expect(result.hasAnomalies).toBe(false);
    });
  });
});
