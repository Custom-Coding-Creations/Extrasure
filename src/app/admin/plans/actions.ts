"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  createServiceCatalogItem,
  deleteOrDeactivateServiceCatalogItem,
  type ServiceCatalogItemInput,
  updateServiceCatalogItem,
} from "@/lib/service-catalog";

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function getPlanInput(formData: FormData): ServiceCatalogItemInput {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    serviceType: String(formData.get("serviceType") ?? ""),
    kind: String(formData.get("kind") ?? "one_time") as ServiceCatalogItemInput["kind"],
    billingCycle: String(formData.get("billingCycle") ?? "one_time") as ServiceCatalogItemInput["billingCycle"],
    amount: Number(formData.get("amount") ?? 0),
    active: parseBoolean(formData.get("active")),
    stripeProductId: String(formData.get("stripeProductId") ?? "") || null,
    stripePriceId: String(formData.get("stripePriceId") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };
}

function revalidatePlanPaths() {
  revalidatePath("/admin/plans");
  revalidatePath("/book");
}

export async function createServicePlanAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const created = await createServiceCatalogItem(getPlanInput(formData));

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "service_plan_created",
    entity: "service_catalog_item",
    entityId: created.id,
    after: created,
  });

  revalidatePlanPaths();
}

export async function updateServicePlanAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const planId = String(formData.get("planId") ?? "").trim();
  const input = getPlanInput(formData);
  const updated = await updateServiceCatalogItem(planId, input);

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "service_plan_updated",
    entity: "service_catalog_item",
    entityId: planId,
    after: updated,
  });

  revalidatePlanPaths();
}

export async function deleteServicePlanAction(formData: FormData) {
  const session = await requireAdminRole(["owner"]);
  const planId = String(formData.get("planId") ?? "").trim();
  const result = await deleteOrDeactivateServiceCatalogItem(planId);

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: result.mode === "deleted" ? "service_plan_deleted" : "service_plan_deactivated",
    entity: "service_catalog_item",
    entityId: planId,
    after: {
      mode: result.mode,
      active: result.item.active,
    },
  });

  revalidatePlanPaths();
}
