"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  adjustInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from "@/lib/admin-store";
import type { InventoryItem } from "@/lib/admin-data";

function getInventoryInput(formData: FormData): Omit<InventoryItem, "id"> {
  return {
    name: String(formData.get("name") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    quantity: Number(formData.get("quantity") ?? 0),
    reorderPoint: Number(formData.get("reorderPoint") ?? 0),
    lastUpdated: String(formData.get("lastUpdated") ?? ""),
  };
}

function revalidateInventoryPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
}

export async function createInventoryAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  await createInventoryItem(getInventoryInput(formData));
  revalidateInventoryPaths();
}

export async function updateInventoryAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const itemId = String(formData.get("itemId") ?? "").trim();

  await updateInventoryItem(itemId, getInventoryInput(formData));
  revalidateInventoryPaths();
}

export async function deleteInventoryAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const itemId = String(formData.get("itemId") ?? "").trim();

  await deleteInventoryItem(itemId);
  revalidateInventoryPaths();
}

export async function restockInventoryAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const itemId = String(formData.get("itemId") ?? "").trim();
  const delta = Number(formData.get("delta") ?? 0);

  await adjustInventoryQuantity(itemId, delta);
  revalidateInventoryPaths();
}