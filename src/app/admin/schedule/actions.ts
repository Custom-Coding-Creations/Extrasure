"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createJob, deleteJob, updateJob } from "@/lib/admin-store";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit-log";
import type { Job } from "@/lib/admin-data";

function getJobInput(formData: FormData): Omit<Job, "id"> {
  return {
    customerId: String(formData.get("customerId") ?? ""),
    service: String(formData.get("service") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    status: String(formData.get("status") ?? "scheduled") as Job["status"],
    technicianId: String(formData.get("technicianId") ?? ""),
    emergency: formData.get("emergency") === "on",
  };
}

function revalidateSchedulePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
}

export async function createJobAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  await createJob(getJobInput(formData));
  revalidateSchedulePaths();
}

export async function updateJobAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const jobId = String(formData.get("jobId") ?? "").trim();

  await updateJob(jobId, getJobInput(formData));
  revalidateSchedulePaths();
}

export async function deleteJobAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const jobId = String(formData.get("jobId") ?? "").trim();

  await deleteJob(jobId);
  revalidateSchedulePaths();
}

export async function convertBookingToJobAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const technicianId = String(formData.get("technicianId") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();

  if (!bookingId || !technicianId || !scheduledAt) {
    throw new Error("Booking id, technician, and schedule are required.");
  }

  const booking = await prisma.serviceBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (!booking.invoiceId) {
    throw new Error("Booking invoice is missing.");
  }

  const [invoice, catalogItem] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: booking.invoiceId } }),
    prisma.serviceCatalogItem.findUnique({ where: { id: booking.serviceCatalogItemId } }),
  ]);

  if (!invoice || invoice.status !== "paid") {
    throw new Error("Booking must be paid before dispatch scheduling.");
  }

  if (!catalogItem) {
    throw new Error("Booking service catalog item not found.");
  }

  const createdJob = await createJob({
    customerId: booking.customerId,
    service: catalogItem.name,
    scheduledAt,
    status: "scheduled",
    technicianId,
    emergency: false,
  });

  await prisma.serviceBooking.update({
    where: { id: bookingId },
    data: {
      status: "scheduled",
    },
  });

  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "job_created",
    entity: "job",
    entityId: createdJob.id,
    after: {
      source: "service_booking",
      bookingId,
      customerId: booking.customerId,
    },
  });

  revalidateSchedulePaths();
}