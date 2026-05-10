"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import { createAdminUser, deleteAdminUser, toggleAdminUserTwoFactor, updateAdminUser } from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";
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
  try {
    const session = await requireAdminRole(["owner"]);
    const user = await createAdminUser(getAdminUserInput(formData));
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "admin_user_created",
      entity: "admin_user",
      entityId: user.id,
    });
  } catch (error) {
    console.error("[admin/settings] createAdminUserAction failed", error);
  }

  revalidateSettingsPaths();
}

export async function updateAdminUserAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const userId = String(formData.get("userId") ?? "").trim();
    await updateAdminUser(userId, getAdminUserInput(formData));
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "admin_user_updated",
      entity: "admin_user",
      entityId: userId,
    });
  } catch (error) {
    console.error("[admin/settings] updateAdminUserAction failed", error);
  }

  revalidateSettingsPaths();
}

export async function deleteAdminUserAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const userId = String(formData.get("userId") ?? "").trim();
    await deleteAdminUser(userId);
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "admin_user_deleted",
      entity: "admin_user",
      entityId: userId,
    });
  } catch (error) {
    console.error("[admin/settings] deleteAdminUserAction failed", error);
  }

  revalidateSettingsPaths();
}

export async function toggleAdminUserTwoFactorAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const userId = String(formData.get("userId") ?? "").trim();
    await toggleAdminUserTwoFactor(userId);
    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "admin_user_2fa_toggled",
      entity: "admin_user",
      entityId: userId,
    });
  } catch (error) {
    console.error("[admin/settings] toggleAdminUserTwoFactorAction failed", error);
  }

  revalidateSettingsPaths();
}