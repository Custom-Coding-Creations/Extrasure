import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiRole, requireAdminApiSession } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  getOperationalSettings,
  setTriageKillSwitch,
  setTriageHumanReviewThreshold,
} from "@/lib/admin-operational-settings";
import { logTriageOperationalEvent } from "@/lib/triage-runtime";

type OperationalPayload = {
  action?: "enable" | "disable" | "set_threshold";
  threshold?: number;
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

  const settings = await getOperationalSettings();

  return NextResponse.json({
    ok: true,
    settings,
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

  let payload: OperationalPayload;

  try {
    payload = (await request.json()) as OperationalPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const action = payload.action;

  if (action !== "enable" && action !== "disable" && action !== "set_threshold") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  if (action === "set_threshold") {
    if (typeof payload.threshold !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid threshold parameter for set_threshold action" },
        { status: 400 },
      );
    }

    try {
      const settings = await setTriageHumanReviewThreshold(payload.threshold, session.name);

      await recordAuditEvent({
        actor: session.name,
        role: session.role,
        action: "triage_threshold_adjusted",
        entity: "triage_operational",
        entityId: "triage_human_review_threshold",
        after: {
          threshold: settings.triageHumanReviewThreshold,
        },
      });

      logTriageOperationalEvent("threshold_adjusted", {
        actor: session.name,
        threshold: settings.triageHumanReviewThreshold,
      });

      return NextResponse.json({
        ok: true,
        settings,
      });
    } catch (error) {
      console.error("Failed to set triage threshold:", error);
      return NextResponse.json({ error: "Failed to set threshold" }, { status: 500 });
    }
  }

  const willDisable = action === "disable";

  try {
    const settings = await setTriageKillSwitch(willDisable, session.name);

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "triage_kill_switch_toggled",
      entity: "triage_operational",
      entityId: "triage_kill_switch",
      after: {
        action,
        disabled: willDisable,
      },
    });

    logTriageOperationalEvent("kill_switch_toggled", {
      actor: session.name,
      action,
      disabled: willDisable,
    });

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    console.error("Failed to toggle triage kill switch:", error);
    return NextResponse.json({ error: "Failed to toggle kill switch" }, { status: 500 });
  }
}
