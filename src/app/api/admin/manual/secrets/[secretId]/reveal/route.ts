import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { revealManualSecretValue } from "@/lib/admin-manual-store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ secretId: string }> },
) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { secretId } = await params;
    const secret = await revealManualSecretValue(secretId);

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "manual_secret_viewed",
      entity: "admin_manual_secret",
      entityId: secret.id,
      after: {
        title: secret.title,
      },
    });

    return NextResponse.json({ ok: true, value: secret.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to access secret.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
