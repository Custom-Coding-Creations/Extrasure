"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  updateTechnicianSchedule,
  addScheduleException,
  removeScheduleException,
  getTechnicianSchedule,
} from "@/lib/admin-store";

function revalidateTechnicianPaths() {
  revalidatePath("/admin/technicians");
}

export async function updateTechnicianScheduleAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const technicianId = String(formData.get("technicianId") ?? "").trim();

  if (!technicianId) {
    throw new Error("Technician id is required.");
  }

  // Parse schedule data from form
  // Expected format: each day of week has start/end/breakStart/breakEnd fields
  const schedules = [];
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;

  for (const day of daysOfWeek) {
    const startTime = String(formData.get(`${day}_start`) ?? "08:00").trim();
    const endTime = String(formData.get(`${day}_end`) ?? "17:00").trim();
    const breakStartTime = String(formData.get(`${day}_break_start`) ?? "").trim() || null;
    const breakEndTime = String(formData.get(`${day}_break_end`) ?? "").trim() || null;

    schedules.push({
      dayOfWeek: day,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
    });
  }

  const result = await updateTechnicianSchedule(technicianId, schedules);

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "technician_schedule_updated",
    entity: "technician",
    entityId: technicianId,
    after: {
      schedules: result.length,
    },
  });

  revalidateTechnicianPaths();
}

export async function addScheduleExceptionAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const technicianId = String(formData.get("technicianId") ?? "").trim();
  const exceptionDate = String(formData.get("exceptionDate") ?? "").trim();
  const isDayOff = formData.get("isDayOff") === "on";
  const startTime = String(formData.get("startTime") ?? "").trim() || undefined;
  const endTime = String(formData.get("endTime") ?? "").trim() || undefined;

  if (!technicianId || !exceptionDate) {
    throw new Error("Technician id and exception date are required.");
  }

  const result = await addScheduleException(technicianId, {
    exceptionDate,
    startTime,
    endTime,
    isDayOff,
  });

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "schedule_exception_added",
    entity: "technician",
    entityId: technicianId,
    after: {
      exceptionDate,
      isDayOff,
    },
  });

  revalidateTechnicianPaths();
}

export async function removeScheduleExceptionAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const exceptionId = String(formData.get("exceptionId") ?? "").trim();
  const technicianId = String(formData.get("technicianId") ?? "").trim();

  if (!exceptionId || !technicianId) {
    throw new Error("Exception id and technician id are required.");
  }

  await removeScheduleException(exceptionId);

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "schedule_exception_removed",
    entity: "technician",
    entityId: technicianId,
    after: {
      exceptionId,
    },
  });

  revalidateTechnicianPaths();
}
