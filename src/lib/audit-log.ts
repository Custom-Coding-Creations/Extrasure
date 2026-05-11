import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "job_created"
  | "job_updated"
  | "job_deleted"
  | "invoice_created"
  | "invoice_updated"
  | "invoice_deleted"
  | "estimate_created"
  | "estimate_updated"
  | "estimate_deleted"
  | "estimate_approved"
  | "estimate_declined"
  | "estimate_converted_to_job"
  | "estimate_converted_to_invoice"
  | "inventory_created"
  | "inventory_updated"
  | "inventory_deleted"
  | "inventory_adjusted"
  | "automation_created"
  | "automation_updated"
  | "automation_deleted"
  | "automation_status_changed"
  | "admin_user_created"
  | "admin_user_updated"
  | "admin_user_deleted"
  | "admin_user_2fa_toggled"
  | "technician_created"
  | "technician_updated"
  | "technician_deleted"
  | "technician_deduplicated"
  | "technician_status_changed"
  | "payment_refunded"
  | "payment_retried";

export async function recordAuditEvent({
  actor,
  role,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  actor: string;
  role: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        id: `audit_${Date.now()}`,
        actor,
        role,
        action,
        entity,
        entityId,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit event:", error);
  }
}

export async function getAuditEvents(
  filters?: {
    entity?: string;
    action?: string;
    actor?: string;
    fromDate?: Date;
    toDate?: Date;
  },
  limit?: number,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters?.entity) {
    where.entity = filters.entity;
  }

  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.actor) {
    where.actor = filters.actor;
  }

  if (filters?.fromDate || filters?.toDate) {
    where.timestamp = {};

    if (filters?.fromDate) {
      where.timestamp.gte = filters.fromDate;
    }

    if (filters?.toDate) {
      where.timestamp.lte = filters.toDate;
    }
  }

  return prisma.auditEvent.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit ?? 100,
  });
}

export function parseAuditSnapshot(json: string | null) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}
