import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { parseAuditSnapshot } from "@/lib/audit-log";
import type { ChatbotOperationAction, ChatbotOperationResult } from "@/lib/chatbot-operations";
import { prisma } from "@/lib/prisma";

const CHATBOT_OPERATION_AUDIT_ACTIONS = [
  "chatbot_operation_requested",
  "chatbot_operation_denied",
  "chatbot_operation_confirmed",
  "chatbot_operation_executed",
] as const;

type AuditAction = (typeof CHATBOT_OPERATION_AUDIT_ACTIONS)[number];

type OperationHistoryEntry = {
  id: string;
  createdAt: string;
  action: ChatbotOperationAction;
  status: ChatbotOperationResult["status"];
  message: string;
  source: "audit";
  auditAction: AuditAction;
  actor: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

const VALID_OPERATION_ACTIONS = new Set<ChatbotOperationAction>([
  "list_appointments",
  "list_technicians",
  "get_availability",
  "schedule_appointment",
  "reschedule_appointment",
  "cancel_appointment",
  "assign_technician",
]);

function parseLimit(rawLimit: string | null) {
  const parsed = Number.parseInt(rawLimit ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 100);
}

function parseScope(rawScope: string | null) {
  if (rawScope === "all") {
    return "all" as const;
  }

  return "self" as const;
}

function resolveOperationAction(after: Record<string, unknown> | null) {
  const fromAfter = typeof after?.operationAction === "string" ? after.operationAction : after?.action;

  if (typeof fromAfter !== "string") {
    return null;
  }

  return VALID_OPERATION_ACTIONS.has(fromAfter as ChatbotOperationAction)
    ? (fromAfter as ChatbotOperationAction)
    : null;
}

function resolveStatus(auditAction: AuditAction): ChatbotOperationResult["status"] {
  if (auditAction === "chatbot_operation_executed") {
    return "success";
  }

  if (auditAction === "chatbot_operation_denied") {
    return "error";
  }

  return "requires_confirmation";
}

function resolveMessage(auditAction: AuditAction, operationAction: ChatbotOperationAction) {
  switch (auditAction) {
    case "chatbot_operation_requested":
      return `${operationAction} requested.`;
    case "chatbot_operation_denied":
      return `${operationAction} was denied by role policy.`;
    case "chatbot_operation_confirmed":
      return `${operationAction} was confirmed for execution.`;
    case "chatbot_operation_executed":
      return `${operationAction} completed successfully.`;
    default:
      return `${operationAction} recorded.`;
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const limit = parseLimit(requestUrl.searchParams.get("limit"));
  const scope = parseScope(requestUrl.searchParams.get("scope"));

  if (scope === "all" && session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const events = await prisma.auditEvent.findMany({
      where: {
        entity: "chatbot_operation",
        ...(scope === "all" ? {} : { actor: session.name }),
        action: {
          in: [...CHATBOT_OPERATION_AUDIT_ACTIONS],
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });

    const entries: OperationHistoryEntry[] = events
      .map((event) => {
        const before = parseAuditSnapshot(event.before) as Record<string, unknown> | null;
        const after = parseAuditSnapshot(event.after) as Record<string, unknown> | null;
        const operationAction = resolveOperationAction(after);

        if (!operationAction) {
          return null;
        }

        const auditAction = event.action as AuditAction;

        return {
          id: event.id,
          createdAt: event.timestamp.toISOString(),
          action: operationAction,
          status: resolveStatus(auditAction),
          message: resolveMessage(auditAction, operationAction),
          source: "audit",
          auditAction,
          actor: event.actor,
          entityId: event.entityId,
          before,
          after,
        };
      })
      .filter((entry): entry is OperationHistoryEntry => entry !== null);

    return NextResponse.json({
      ok: true,
      entries,
      count: entries.length,
      capabilities: {
        canViewAllScope: session.role === "owner",
        viewerRole: session.role,
      },
    });
  } catch (error) {
    console.error("Failed to fetch chatbot operation history:", error);
    return NextResponse.json({ error: "Failed to fetch operation history" }, { status: 500 });
  }
}
