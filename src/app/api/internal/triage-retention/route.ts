import { NextRequest, NextResponse } from "next/server";
import { executeTriageRetention } from "@/lib/triage-retention";
import { logTriageOperationalEvent } from "@/lib/triage-runtime";

function readSecretFromRequest(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.trim();

  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return request.headers.get("x-triage-retention-secret")?.trim() ?? "";
}

async function handlePurge(request: NextRequest) {
  const configuredSecret = process.env.TRIAGE_RETENTION_CRON_SECRET?.trim();

  if (!configuredSecret) {
    logTriageOperationalEvent("retention_endpoint_unconfigured", {
      endpoint: "internal",
    });
    return NextResponse.json({ error: "Retention endpoint is not configured" }, { status: 503 });
  }

  const providedSecret = readSecretFromRequest(request);

  if (!providedSecret || providedSecret !== configuredSecret) {
    logTriageOperationalEvent("retention_auth_failed", {
      endpoint: "internal",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";
  const result = await executeTriageRetention({ dryRun });
  logTriageOperationalEvent("retention_executed", {
    endpoint: "internal",
    dryRun,
    deletedRecordCount: result.deletedRecordCount,
    deletedBlobCount: result.deletedBlobCount,
    matchedPhotoAssessmentCount: result.matchedPhotoAssessmentCount,
  });

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return handlePurge(request);
}

export async function POST(request: NextRequest) {
  return handlePurge(request);
}