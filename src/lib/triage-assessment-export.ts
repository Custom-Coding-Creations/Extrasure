import { prisma } from "@/lib/prisma";

export type ExportFormat = "csv" | "json";

export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  maxConfidence?: number;
  severity?: string[];
  urgency?: string[];
  limit?: number;
}

export interface AssessmentExportData {
  id: string;
  customerId: string;
  source: string;
  likelyPest: string;
  confidence: number;
  severity: string;
  urgency: string;
  estimatedPriceRange: string;
  recommendedService: string;
  recommendedTimeline: string;
  conversionLikelihood: string;
  photosJson: string | null;
  createdAt: Date;
  overrideCount: number;
}

/**
 * Export triage assessments to CSV format
 */
export async function exportAssessmentsAsCSV(filters: ExportFilters = {}): Promise<string> {
  const assessments = await fetchAssessmentsForExport(filters);

  // CSV header
  const headers = [
    "ID",
    "Customer ID",
    "Source",
    "Likely Pest",
    "Confidence",
    "Severity",
    "Urgency",
    "Estimated Price Range",
    "Recommended Service",
    "Recommended Timeline",
    "Conversion Likelihood",
    "Photos JSON",
    "Created At",
    "Override Count",
  ];

  // CSV rows
  const rows = assessments.map((a) => [
    a.id,
    a.customerId,
    a.source,
    a.likelyPest,
    a.confidence.toFixed(4),
    a.severity,
    a.urgency,
    a.estimatedPriceRange,
    a.recommendedService,
    a.recommendedTimeline,
    a.conversionLikelihood,
    a.photosJson ?? "",
    a.createdAt.toISOString(),
    a.overrideCount.toString(),
  ]);

  // Combine header and rows
  const csvLines = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(","));

  return csvLines.join("\n");
}

/**
 * Export triage assessments to JSON format
 */
export async function exportAssessmentsAsJSON(filters: ExportFilters = {}): Promise<string> {
  const assessments = await fetchAssessmentsForExport(filters);

  const exportData = {
    exportedAt: new Date().toISOString(),
    filters: {
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      minConfidence: filters.minConfidence,
      maxConfidence: filters.maxConfidence,
      severity: filters.severity,
      urgency: filters.urgency,
    },
    totalCount: assessments.length,
    assessments: assessments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Fetch assessments for export with filters
 */
async function fetchAssessmentsForExport(filters: ExportFilters = {}): Promise<AssessmentExportData[]> {
  const { startDate, endDate, minConfidence, maxConfidence, severity, urgency, limit = 10000 } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {};

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = startDate;
    if (endDate) whereClause.createdAt.lte = endDate;
  }

  if (minConfidence !== undefined || maxConfidence !== undefined) {
    whereClause.confidence = {};
    if (minConfidence !== undefined) whereClause.confidence.gte = minConfidence;
    if (maxConfidence !== undefined) whereClause.confidence.lte = maxConfidence;
  }

  if (severity && severity.length > 0) {
    whereClause.severity = { in: severity };
  }

  if (urgency && urgency.length > 0) {
    whereClause.urgency = { in: urgency };
  }

  const assessments = await prisma.triageAssessment.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      overrides: {
        select: { id: true },
      },
    },
  });

  return assessments.map((a) => ({
    id: a.id,
    customerId: a.customerId,
    source: a.source,
    likelyPest: a.likelyPest,
    confidence: a.confidence,
    severity: a.severity,
    urgency: a.urgency,
    estimatedPriceRange: a.estimatedPriceRange,
    recommendedService: a.recommendedService,
    recommendedTimeline: a.recommendedTimeline,
    conversionLikelihood: a.conversionLikelihood,
    photosJson: a.photosJson,
    createdAt: a.createdAt,
    overrideCount: a.overrides.length,
  }));
}

/**
 * Get export statistics
 */
export async function getExportStats(filters: ExportFilters = {}): Promise<{
  totalAssessments: number;
  dateRange: { earliest: Date | null; latest: Date | null };
  averageConfidence: number;
  severityBreakdown: Record<string, number>;
  urgencyBreakdown: Record<string, number>;
}> {
  const assessments = await fetchAssessmentsForExport(filters);

  const severityBreakdown: Record<string, number> = {};
  const urgencyBreakdown: Record<string, number> = {};
  let confidenceSum = 0;

  assessments.forEach((a) => {
    severityBreakdown[a.severity] = (severityBreakdown[a.severity] ?? 0) + 1;
    urgencyBreakdown[a.urgency] = (urgencyBreakdown[a.urgency] ?? 0) + 1;
    confidenceSum += a.confidence;
  });

  const earliest = assessments.length > 0 ? assessments[assessments.length - 1].createdAt : null;
  const latest = assessments.length > 0 ? assessments[0].createdAt : null;

  return {
    totalAssessments: assessments.length,
    dateRange: { earliest, latest },
    averageConfidence: assessments.length > 0 ? confidenceSum / assessments.length : 0,
    severityBreakdown,
    urgencyBreakdown,
  };
}
