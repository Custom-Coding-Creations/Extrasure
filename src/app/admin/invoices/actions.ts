"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createInvoice, deleteInvoice, updateInvoice } from "@/lib/admin-store";
import type { Invoice } from "@/lib/admin-data";

function getInvoiceInput(formData: FormData): Omit<Invoice, "id"> {
  return {
    customerId: String(formData.get("customerId") ?? ""),
    estimateId: String(formData.get("estimateId") ?? "").trim() || null,
    amount: Number(formData.get("amount") ?? 0),
    dueDate: String(formData.get("dueDate") ?? ""),
    status: String(formData.get("status") ?? "open") as Invoice["status"],
    billingCycle: String(formData.get("billingCycle") ?? "one_time") as Invoice["billingCycle"],
    stripeCustomerId: String(formData.get("stripeCustomerId") ?? "").trim() || null,
    stripeCheckoutSessionId: String(formData.get("stripeCheckoutSessionId") ?? "").trim() || null,
    stripePaymentIntentId: String(formData.get("stripePaymentIntentId") ?? "").trim() || null,
    stripeSubscriptionId: String(formData.get("stripeSubscriptionId") ?? "").trim() || null,
    stripeInvoiceId: String(formData.get("stripeInvoiceId") ?? "").trim() || null,
    checkoutUrl: String(formData.get("checkoutUrl") ?? "").trim() || null,
    paidAt: String(formData.get("paidAt") ?? "").trim() || null,
    refundedAt: String(formData.get("refundedAt") ?? "").trim() || null,
    paymentStatusUpdatedAt: String(formData.get("paymentStatusUpdatedAt") ?? "").trim() || null,
  };
}

function revalidateInvoicePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/payments");
}

export async function createInvoiceAction(formData: FormData) {
  await requireAdminRole(["owner", "accountant", "dispatch"]);
  await createInvoice(getInvoiceInput(formData));
  revalidateInvoicePaths();
}

export async function updateInvoiceAction(formData: FormData) {
  await requireAdminRole(["owner", "accountant", "dispatch"]);
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();

  await updateInvoice(invoiceId, getInvoiceInput(formData));
  revalidateInvoicePaths();
}

export async function deleteInvoiceAction(formData: FormData) {
  await requireAdminRole(["owner", "accountant"]);
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();

  await deleteInvoice(invoiceId);
  revalidateInvoicePaths();
}