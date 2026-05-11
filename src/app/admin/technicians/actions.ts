"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  createTechnician,
  dedupeTechniciansByName,
  deleteTechnician,
  setTechnicianAvailability,
  updateTechnician,
} from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";

type TechnicianStatus = "available" | "in_route" | "on_job" | "off_shift";

function getTechnicianInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? "available") as TechnicianStatus,
  };
}

function revalidateTechnicianPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/technicians");
  revalidatePath("/admin/schedule");
}

function handleActionError(error: unknown, context: string): never {
  if (isRedirectError(error)) throw error;
  console.error(`[admin/technicians] ${context}`, error);
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  redirect(`/admin/technicians?error=${encodeURIComponent(message)}`);
}

export async function createTechnicianAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner", "dispatch"]);
    const technician = await createTechnician(getTechnicianInput(formData));
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "technician_created",
      entity: "technician",
      entityId: technician.id,
    });
  } catch (error) {
    handleActionError(error, "createTechnicianAction failed");
  }

  revalidateTechnicianPaths();
}

export async function updateTechnicianAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner", "dispatch"]);
    const technicianId = String(formData.get("technicianId") ?? "").trim();

    await updateTechnician(technicianId, getTechnicianInput(formData));
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "technician_updated",
      entity: "technician",
      entityId: technicianId,
    });
  } catch (error) {
    handleActionError(error, "updateTechnicianAction failed");
  }

  revalidateTechnicianPaths();
}

export async function deleteTechnicianAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner", "dispatch"]);
    const technicianId = String(formData.get("technicianId") ?? "").trim();

    await deleteTechnician(technicianId);
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "technician_deleted",
      entity: "technician",
      entityId: technicianId,
    });
  } catch (error) {
    handleActionError(error, "deleteTechnicianAction failed");
  }

  revalidateTechnicianPaths();
}

export async function setTechnicianStatusAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner", "dispatch"]);
    const technicianId = String(formData.get("technicianId") ?? "").trim();
    const status = String(formData.get("status") ?? "available") as TechnicianStatus;

    await setTechnicianAvailability(technicianId, status);
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "technician_status_changed",
      entity: "technician",
      entityId: technicianId,
      after: { status },
    });
  } catch (error) {
    handleActionError(error, "setTechnicianStatusAction failed");
  }

  revalidateTechnicianPaths();
}

export async function dedupeTechniciansAction() {
  try {
    const session = await requireAdminRole(["owner", "dispatch"]);
    const result = await dedupeTechniciansByName();

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "technician_deduplicated",
      entity: "technician",
      entityId: "dedupe",
      after: result,
    });
  } catch (error) {
    handleActionError(error, "dedupeTechniciansAction failed");
  }

  revalidateTechnicianPaths();
}
