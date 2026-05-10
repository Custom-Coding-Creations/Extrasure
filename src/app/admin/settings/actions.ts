"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createAdminUser, deleteAdminUser, toggleAdminUserTwoFactor, updateAdminUser } from "@/lib/admin-store";
import type { adminUsers } from "@/lib/admin-data";

type AdminUserRole = (typeof adminUsers)[number]["role"];

function getAdminUserInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? "owner") as AdminUserRole,
    twoFactorEnabled: formData.get("twoFactorEnabled") === "on",
  };
}

function revalidateSettingsPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}

export async function createAdminUserAction(formData: FormData) {
  await requireAdminRole(["owner"]);
  await createAdminUser(getAdminUserInput(formData));
  revalidateSettingsPaths();
}

export async function updateAdminUserAction(formData: FormData) {
  await requireAdminRole(["owner"]);
  const userId = String(formData.get("userId") ?? "").trim();

  await updateAdminUser(userId, getAdminUserInput(formData));
  revalidateSettingsPaths();
}

export async function deleteAdminUserAction(formData: FormData) {
  await requireAdminRole(["owner"]);
  const userId = String(formData.get("userId") ?? "").trim();

  await deleteAdminUser(userId);
  revalidateSettingsPaths();
}

export async function toggleAdminUserTwoFactorAction(formData: FormData) {
  await requireAdminRole(["owner"]);
  const userId = String(formData.get("userId") ?? "").trim();

  await toggleAdminUserTwoFactor(userId);
  revalidateSettingsPaths();
}