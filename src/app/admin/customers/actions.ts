"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";
import type { Customer } from "@/lib/admin-data";

function getCustomerInput(formData: FormData): Omit<Customer, "id"> {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    city: String(formData.get("city") ?? ""),
    activePlan: String(formData.get("activePlan") ?? "none") as Customer["activePlan"],
    lifecycle: String(formData.get("lifecycle") ?? "lead") as Customer["lifecycle"],
    lastServiceDate: String(formData.get("lastServiceDate") ?? ""),
  };
}

function revalidateCustomerPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
}

export async function createCustomerAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const input = getCustomerInput(formData);
  const customer = await createCustomer(input);
  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "customer_created",
    entity: "customer",
    entityId: customer.id,
    after: customer,
  });
  revalidateCustomerPaths();
}

export async function updateCustomerAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const customerId = String(formData.get("customerId") ?? "").trim();
  const input = getCustomerInput(formData);
  await updateCustomer(customerId, input);
  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "customer_updated",
    entity: "customer",
    entityId: customerId,
  });
  revalidateCustomerPaths();
}

export async function deleteCustomerAction(formData: FormData) {
  const session = await requireAdminRole(["owner", "dispatch"]);
  const customerId = String(formData.get("customerId") ?? "").trim();
  await deleteCustomer(customerId);
  await recordAuditEvent({
    actor: session.name,
    role: session.role,
    action: "customer_deleted",
    entity: "customer",
    entityId: customerId,
  });
  revalidateCustomerPaths();
}