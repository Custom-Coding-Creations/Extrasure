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
  await requireAdminRole(["owner", "dispatch"]);
  await createTechnician(getTechnicianInput(formData));
  revalidateTechnicianPaths();
}

export async function updateTechnicianAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const technicianId = String(formData.get("technicianId") ?? "").trim();

  await updateTechnician(technicianId, getTechnicianInput(formData));
  revalidateTechnicianPaths();
}

export async function deleteTechnicianAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const technicianId = String(formData.get("technicianId") ?? "").trim();

  await deleteTechnician(technicianId);
  revalidateTechnicianPaths();
}

export async function setTechnicianStatusAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const technicianId = String(formData.get("technicianId") ?? "").trim();
  const status = String(formData.get("status") ?? "available") as TechnicianStatus;

  await setTechnicianAvailability(technicianId, status);
  revalidateTechnicianPaths();
}
