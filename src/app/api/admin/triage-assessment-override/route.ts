import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { overrideTriageAssessment, getRecentOverrides, getOverrideStats } from "@/lib/triage-assessment-override";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const action = searchParams.get("action");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const hoursBack = parseInt(searchParams.get("hoursBack") ?? "24", 10);

  if (action === "recent") {
    const overrides = await getRecentOverrides(Math.min(limit, 100));
    return NextResponse.json({ ok: true, overrides });
  }

  if (action === "stats") {
    const clamped = Math.max(1, Math.min(hoursBack, 168));
    const stats = await getOverrideStats(clamped);
    return NextResponse.json({ ok: true, stats });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners can override assessments
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { assessmentId, newConfidence, reason, notes } = body as {
      assessmentId: string;
      newConfidence: number;
      reason: string;
      notes?: string;
    };

    if (!assessmentId || newConfidence === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, newConfidence, reason" },
        { status: 400 },
      );
    }

    const result = await overrideTriageAssessment({
      assessmentId,
      newConfidence,
      reason: reason as import("@/lib/triage-assessment-override").AssessmentOverrideReason,
      notes,
      actorId: session.name,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, override: result.override });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
