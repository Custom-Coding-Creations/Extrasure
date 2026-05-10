"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createJob, deleteJob, updateJob } from "@/lib/admin-store";
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