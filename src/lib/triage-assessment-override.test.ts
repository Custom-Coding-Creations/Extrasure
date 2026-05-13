import { overrideTriageAssessment, getRecentOverrides, getOverrideStats } from "@/lib/triage-assessment-override";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    triageAssessment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assessmentOverride: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    triageAssessment: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    assessmentOverride: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

const { recordAuditEvent } = jest.requireMock("@/lib/audit-log") as {
  recordAuditEvent: jest.Mock;
};

describe("triage assessment override", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("overrideTriageAssessment", () => {
    it("successfully overrides assessment confidence", async () => {
      const assessment = { id: "triage_123", confidence: 0.6, customerId: "cust_1" };
      prisma.triageAssessment.findUnique.mockResolvedValue(assessment);
      prisma.assessmentOverride.create.mockResolvedValue({
        id: "override_1",
        triageAssessmentId: "triage_123",
        previousConfidence: 0.6,
        newConfidence: 0.85,
        reason: "incorrect_confidence",
        notes: "Model underestimated confidence",
        overriddenBy: "admin_user",
        createdAt: new Date(),
      });
      prisma.triageAssessment.update.mockResolvedValue({
        ...assessment,
        confidence: 0.85,
      });

      const result = await overrideTriageAssessment({
        assessmentId: "triage_123",
        newConfidence: 0.85,
        reason: "incorrect_confidence",
        notes: "Model underestimated confidence",
        actorId: "admin_user",
        actorRole: "owner",
      });

      expect(result.success).toBe(true);
      expect(result.override?.newConfidence).toBe(0.85);
      expect(prisma.triageAssessment.update).toHaveBeenCalledWith({
        where: { id: "triage_123" },
        data: { confidence: 0.85 },
      });
      expect(recordAuditEvent).toHaveBeenCalled();
    });

    it("returns error for nonexistent assessment", async () => {
      prisma.triageAssessment.findUnique.mockResolvedValue(null);

      const result = await overrideTriageAssessment({
        assessmentId: "nonexistent",
        newConfidence: 0.8,
        reason: "model_misclassification",
        actorId: "admin_user",
        actorRole: "owner",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("validates confidence score range", async () => {
      const assessment = { id: "triage_123", confidence: 0.6, customerId: "cust_1" };
      prisma.triageAssessment.findUnique.mockResolvedValue(assessment);

      const result = await overrideTriageAssessment({
        assessmentId: "triage_123",
        newConfidence: 1.5,
        reason: "incorrect_confidence",
        actorId: "admin_user",
        actorRole: "owner",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("between 0 and 1");
    });

    it("handles database errors gracefully", async () => {
      const assessment = { id: "triage_123", confidence: 0.6, customerId: "cust_1" };
      prisma.triageAssessment.findUnique.mockResolvedValue(assessment);
      prisma.assessmentOverride.create.mockRejectedValue(new Error("Database error"));

      const result = await overrideTriageAssessment({
        assessmentId: "triage_123",
        newConfidence: 0.8,
        reason: "incorrect_confidence",
        actorId: "admin_user",
        actorRole: "owner",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  describe("getRecentOverrides", () => {
    it("returns recent overrides ordered by date", async () => {
      const overrides = [
        {
          id: "override_1",
          triageAssessmentId: "triage_1",
          previousConfidence: 0.6,
          newConfidence: 0.8,
          reason: "incorrect_confidence",
          notes: null,
          overriddenBy: "admin_1",
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "override_2",
          triageAssessmentId: "triage_2",
          previousConfidence: 0.5,
          newConfidence: 0.75,
          reason: "model_misclassification",
          notes: null,
          overriddenBy: "admin_2",
          createdAt: new Date("2024-01-02"),
        },
      ];
      prisma.assessmentOverride.findMany.mockResolvedValue(overrides);

      const result = await getRecentOverrides(10);

      expect(result).toHaveLength(2);
      expect(result[0].triageAssessmentId).toBe("triage_1");
      expect(prisma.assessmentOverride.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    });
  });

  describe("getOverrideStats", () => {
    it("calculates override statistics", async () => {
      const overrides = [
        {
          id: "override_1",
          triageAssessmentId: "triage_1",
          previousConfidence: 0.6,
          newConfidence: 0.8,
          reason: "incorrect_confidence",
          notes: null,
          overriddenBy: "admin_1",
          createdAt: new Date(),
        },
        {
          id: "override_2",
          triageAssessmentId: "triage_2",
          previousConfidence: 0.5,
          newConfidence: 0.75,
          reason: "incorrect_confidence",
          notes: null,
          overriddenBy: "admin_2",
          createdAt: new Date(),
        },
        {
          id: "override_3",
          triageAssessmentId: "triage_3",
          previousConfidence: 0.7,
          newConfidence: 0.6,
          reason: "model_misclassification",
          notes: null,
          overriddenBy: "admin_1",
          createdAt: new Date(),
        },
      ];
      prisma.assessmentOverride.findMany.mockResolvedValue(overrides);

      const stats = await getOverrideStats(24);

      expect(stats.totalOverrides).toBe(3);
      expect(stats.reasonBreakdown.incorrect_confidence).toBe(2);
      expect(stats.reasonBreakdown.model_misclassification).toBe(1);
      expect(stats.averageConfidenceChange).toBeCloseTo((0.2 + 0.25 + 0.1) / 3, 2);
    });
  });
});
