"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  approveEstimate,
  convertEstimateToInvoice,
  convertEstimateToJob,
  createEstimate,
  declineEstimate,
  deleteEstimate,
  updateEstimate,
} from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";
import type { Estimate } from "@/lib/admin-data";

function getEstimateInput(formData: FormData): Omit<Estimate, "id"> {
  return {
    customerId: String(formData.get("customerId") ?? ""),
    service: String(formData.get("service") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    status: String(formData.get("status") ?? "sent") as Estimate["status"],
    createdAt: String(formData.get("createdAt") ?? ""),
  };
}

function revalidateEstimatePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/estimates");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/invoices");
}

export async function createEstimateAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  await createEstimate(getEstimateInput(formData));
  revalidateEstimatePaths();
}

export async function updateEstimateAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await updateEstimate(estimateId, getEstimateInput(formData));
  revalidateEstimatePaths();
}

export async function deleteEstimateAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await deleteEstimate(estimateId);
  revalidateEstimatePaths();
}

export async function approveEstimateAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await approveEstimate(estimateId);
  revalidateEstimatePaths();
}

export async function declineEstimateAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await declineEstimate(estimateId);
  revalidateEstimatePaths();
}

export async function convertEstimateToJobAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await convertEstimateToJob(estimateId);
  revalidateEstimatePaths();
}

export async function convertEstimateToInvoiceAction(formData: FormData) {
  await requireAdminRole(["owner", "accountant", "dispatch"]);
  const estimateId = String(formData.get("estimateId") ?? "").trim();

  await convertEstimateToInvoice(estimateId);
  revalidateEstimatePaths();
}