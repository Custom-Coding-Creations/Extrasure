"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/admin-store";
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
  await requireAdminRole(["owner", "dispatch"]);
  await createCustomer(getCustomerInput(formData));
  revalidateCustomerPaths();
}

export async function updateCustomerAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const customerId = String(formData.get("customerId") ?? "").trim();

  await updateCustomer(customerId, getCustomerInput(formData));
  revalidateCustomerPaths();
}

export async function deleteCustomerAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch"]);
  const customerId = String(formData.get("customerId") ?? "").trim();

  await deleteCustomer(customerId);
  revalidateCustomerPaths();
}