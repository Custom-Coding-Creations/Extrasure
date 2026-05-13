import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  createWebhookEndpoint,
  getWebhookEndpoints,
  deleteWebhookEndpoint,
  getWebhookStats,
  getWebhookDeliveryHistory,
  type WebhookEventType,
} from "@/lib/triage-webhook-notifications";
import { recordAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const action = searchParams.get("action");
  const endpointId = searchParams.get("endpointId");
  const hoursBack = parseInt(searchParams.get("hoursBack") ?? "24", 10);

  if (action === "list") {
    const endpoints = await getWebhookEndpoints();
    return NextResponse.json({ ok: true, endpoints });
  }

  if (action === "stats") {
    const clamped = Math.max(1, Math.min(hoursBack, 168));
    const stats = await getWebhookStats(clamped);
    return NextResponse.json({ ok: true, stats });
  }

  if (action === "deliveries" && endpointId) {
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const deliveries = await getWebhookDeliveryHistory(endpointId, Math.min(limit, 200));
    return NextResponse.json({ ok: true, deliveries });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owners can manage webhooks
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { url, eventTypes, action } = body as {
      url?: string;
      eventTypes?: string[];
      action?: string;
    };

    if (action === "delete") {
      const { endpointId } = body as { endpointId: string };
      if (!endpointId) {
        return NextResponse.json({ error: "Missing endpointId" }, { status: 400 });
      }

      await deleteWebhookEndpoint(endpointId);

        await recordAuditEvent({
          action: "triage_webhook_deleted",
          actor: session.name,
          role: session.role,
          entity: "WebhookEndpoint",
          entityId: endpointId,
      });

      return NextResponse.json({ ok: true });
    }

    if (!url || !eventTypes || eventTypes.length === 0) {
      return NextResponse.json({ error: "Missing required fields: url, eventTypes" }, { status: 400 });
    }

      const endpoint = await createWebhookEndpoint(
        url,
        eventTypes as WebhookEventType[],
      );

    await recordAuditEvent({
      action: "triage_webhook_created",
      actor: session.name,
      role: session.role,
      entity: "WebhookEndpoint",
      entityId: endpoint.id,
      after: { url, eventTypes },
    });

    return NextResponse.json({ ok: true, endpoint });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
