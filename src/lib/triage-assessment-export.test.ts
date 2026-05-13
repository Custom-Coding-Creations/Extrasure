import {
  exportAssessmentsAsCSV,
  exportAssessmentsAsJSON,
  getExportStats,
} from "@/lib/triage-assessment-export";

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

describe("triage assessment export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAssessments = [
    {
      id: "assess_1",
      customerId: "customer_1",
      source: "mobile_app",
      likelyPest: "termites",
      confidence: 0.95,
      severity: "high",
      urgency: "immediate",
      estimatedPriceRange: "$300-$500",
      recommendedService: "Termite Treatment",
      recommendedTimeline: "Within 24 hours",
      conversionLikelihood: "high",
      photosJson: '{"photos":["image1.jpg"]}',
      createdAt: new Date("2026-05-13T10:00:00Z"),
      overrides: [{ id: "override_1" }],
    },
    {
      id: "assess_2",
      customerId: "customer_2",
      source: "web",
      likelyPest: "ants",
      confidence: 0.75,
      severity: "low",
      urgency: "routine",
      estimatedPriceRange: "$100-$200",
      recommendedService: "Ant Control",
      recommendedTimeline: "Within 1 week",
      conversionLikelihood: "medium",
      photosJson: null,
      createdAt: new Date("2026-05-12T15:00:00Z"),
      overrides: [],
    },
  ];

  describe("exportAssessmentsAsCSV", () => {
    it("exports assessments to CSV format", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const csv = await exportAssessmentsAsCSV();

      expect(csv).toContain('"ID","Customer ID","Source","Likely Pest","Confidence"');
      expect(csv).toContain('"assess_1","customer_1","mobile_app","termites","0.9500"');
      expect(csv).toContain('"assess_2","customer_2","web","ants","0.7500"');
      expect(csv).toContain('"$300-$500"');
      expect(csv).toContain('"Termite Treatment"');
    });

    it("handles null values in CSV export", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const csv = await exportAssessmentsAsCSV();

      expect(csv).toContain('"$100-$200"');
      expect(csv).toContain('""'); // Empty cell for null photosJson
    });

    it("applies date filters", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([mockAssessments[0]]);

      const startDate = new Date("2026-05-13T00:00:00Z");
      const endDate = new Date("2026-05-13T23:59:59Z");

      await exportAssessmentsAsCSV({ startDate, endDate });

      expect(prisma.triageAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it("applies confidence filters", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([mockAssessments[0]]);

      await exportAssessmentsAsCSV({ minConfidence: 0.9, maxConfidence: 1.0 });

      expect(prisma.triageAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidence: {
              gte: 0.9,
              lte: 1.0,
            },
          }),
        }),
      );
    });
  });

  describe("exportAssessmentsAsJSON", () => {
    it("exports assessments to JSON format", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const json = await exportAssessmentsAsJSON();
      const data = JSON.parse(json);

      expect(data).toHaveProperty("exportedAt");
      expect(data).toHaveProperty("filters");
      expect(data).toHaveProperty("totalCount", 2);
      expect(data.assessments).toHaveLength(2);
      expect(data.assessments[0].id).toBe("assess_1");
      expect(data.assessments[0].confidence).toBe(0.95);
    });

    it("includes filter metadata in JSON export", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const filters = {
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-05-31"),
        minConfidence: 0.5,
        maxConfidence: 1.0,
      };

      const json = await exportAssessmentsAsJSON(filters);
      const data = JSON.parse(json);

      expect(data.filters.startDate).toBe("2026-05-01T00:00:00.000Z");
      expect(data.filters.endDate).toBe("2026-05-31T00:00:00.000Z");
      expect(data.filters.minConfidence).toBe(0.5);
      expect(data.filters.maxConfidence).toBe(1.0);
    });

    it("formats dates as ISO strings in JSON export", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const json = await exportAssessmentsAsJSON();
      const data = JSON.parse(json);

      expect(data.assessments[0].createdAt).toBe("2026-05-13T10:00:00.000Z");
      expect(data.assessments[1].createdAt).toBe("2026-05-12T15:00:00.000Z");
    });
  });

  describe("getExportStats", () => {
    it("calculates export statistics", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const stats = await getExportStats();

      expect(stats.totalAssessments).toBe(2);
      expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
      expect(stats.severityBreakdown).toEqual({ high: 1, low: 1 });
      expect(stats.urgencyBreakdown).toEqual({ immediate: 1, routine: 1 });
    });

    it("calculates date range from assessments", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue(mockAssessments);

      const stats = await getExportStats();

      expect(stats.dateRange.earliest).toEqual(new Date("2026-05-12T15:00:00Z"));
      expect(stats.dateRange.latest).toEqual(new Date("2026-05-13T10:00:00Z"));
    });

    it("handles empty dataset", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([]);

      const stats = await getExportStats();

      expect(stats.totalAssessments).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.dateRange.earliest).toBeNull();
      expect(stats.dateRange.latest).toBeNull();
      expect(stats.severityBreakdown).toEqual({});
      expect(stats.urgencyBreakdown).toEqual({});
    });

    it("respects limit parameter", async () => {
      prisma.triageAssessment.findMany.mockResolvedValue([mockAssessments[0]]);

      await getExportStats({ limit: 100 });

      expect(prisma.triageAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });
});
