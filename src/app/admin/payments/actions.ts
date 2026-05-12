"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  createBillingPortalSession,
  refundPaymentById,
} from "@/lib/stripe-billing";

export async function collectInvoiceAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();

  if (!invoiceId) {
    throw new Error("Missing invoiceId");
  }

  redirect(`/admin/payments/checkout/${invoiceId}`);
}

export async function openBillingPortalAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const customerId = String(formData.get("customerId") ?? "").trim();

  if (!customerId) {
    throw new Error("Missing customerId");
  }

  const session = await createBillingPortalSession(customerId);
  redirect(session.url);
}

export async function refundPaymentAction(formData: FormData) {
  await requireAdminRole(["owner", "accountant"]);
  const paymentId = String(formData.get("paymentId") ?? "").trim();

  if (!paymentId) {
    throw new Error("Missing paymentId");
  }

  await refundPaymentById(paymentId);
  revalidatePath("/admin/payments");
}