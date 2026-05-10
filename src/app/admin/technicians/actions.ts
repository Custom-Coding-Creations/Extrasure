"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  createTechnician,
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
    console.error("[admin/technicians] createTechnicianAction failed", error);
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
    console.error("[admin/technicians] updateTechnicianAction failed", error);
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
    console.error("[admin/technicians] deleteTechnicianAction failed", error);
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
    console.error("[admin/technicians] setTechnicianStatusAction failed", error);
  }

  revalidateTechnicianPaths();
}
