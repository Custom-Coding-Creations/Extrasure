import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  exportAssessmentsAsCSV,
  exportAssessmentsAsJSON,
  getExportStats,
  type ExportFilters,
  type ExportFormat,
} from "@/lib/triage-assessment-export";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "stats") {
    const filters = parseFiltersFromQuery(url.searchParams);
    const stats = await getExportStats(filters);
    return NextResponse.json({ ok: true, stats });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only accountant+ can export
  if (!["owner", "accountant"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { format, filters } = body as {
      format: ExportFormat;
      filters?: ExportFilters;
    };

    if (!format || !["csv", "json"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Must be 'csv' or 'json'" }, { status: 400 });
    }

    // Parse date strings to Date objects
    const parsedFilters: ExportFilters = {
      ...filters,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
    };

    let data: string;
    let contentType: string;
    let filename: string;

    if (format === "csv") {
      data = await exportAssessmentsAsCSV(parsedFilters);
      contentType = "text/csv";
      filename = `triage-assessments-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      data = await exportAssessmentsAsJSON(parsedFilters);
      contentType = "application/json";
      filename = `triage-assessments-${new Date().toISOString().split("T")[0]}.json`;
    }

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function parseFiltersFromQuery(searchParams: URLSearchParams): ExportFilters {
  const filters: ExportFilters = {};

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minConfidence = searchParams.get("minConfidence");
  const maxConfidence = searchParams.get("maxConfidence");
  const severity = searchParams.get("severity");
  const urgency = searchParams.get("urgency");
  const limit = searchParams.get("limit");

  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (minConfidence) filters.minConfidence = parseFloat(minConfidence);
  if (maxConfidence) filters.maxConfidence = parseFloat(maxConfidence);
  if (severity) filters.severity = severity.split(",");
  if (urgency) filters.urgency = urgency.split(",");
  if (limit) filters.limit = Math.min(parseInt(limit, 10), 50000);

  return filters;
}
