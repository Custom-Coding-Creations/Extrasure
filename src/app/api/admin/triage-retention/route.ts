import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiRole, requireAdminApiSession } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { executeTriageRetention } from "@/lib/triage-retention";
import { getTriageRuntimeSnapshot, logTriageOperationalEvent } from "@/lib/triage-runtime";

type RetentionPayload = {
  action?: "dry_run" | "execute";
};

export async function GET() {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleSession = await requireAdminApiRole(["owner", "accountant"]);

  if (!roleSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    runtime: getTriageRuntimeSnapshot(),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleSession = await requireAdminApiRole(["owner"]);

  if (!roleSession) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: RetentionPayload;

  try {
    payload = (await request.json()) as RetentionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const action = payload.action ?? "dry_run";

  if (action !== "dry_run" && action !== "execute") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const dryRun = action === "dry_run";
  const result = await executeTriageRetention({ dryRun });

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "triage_retention_run",
    entity: "triage_retention",
    entityId: `${Date.now()}`,
    after: {
      action,
      dryRun,
      deletedBlobCount: result.deletedBlobCount,
      deletedRecordCount: result.deletedRecordCount,
      matchedPhotoAssessmentCount: result.matchedPhotoAssessmentCount,
    },
  });

  logTriageOperationalEvent("retention_executed", {
    endpoint: "admin",
    actor: session.name,
    dryRun,
    deletedRecordCount: result.deletedRecordCount,
    deletedBlobCount: result.deletedBlobCount,
  });

  return NextResponse.json({
    ...result,
    runtime: getTriageRuntimeSnapshot(),
  });
}
