"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireAdminRole } from "@/lib/admin-auth";
import { createAdminUser, deleteAdminUser, toggleAdminUserTwoFactor, updateAdminUser, updateSchedulingConfig } from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";
import type { adminUsers } from "@/lib/admin-data";

type AdminUserRole = (typeof adminUsers)[number]["role"];

function getAdminUserInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "owner") as AdminUserRole,
    twoFactorEnabled: formData.get("twoFactorEnabled") === "on",
  };
}

function revalidateSettingsPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}

function handleActionError(error: unknown, context: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  console.error(`[admin/settings] ${context}`, error);
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
    handleActionError(error, "createAdminUserAction failed");
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
    handleActionError(error, "updateAdminUserAction failed");
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
    handleActionError(error, "deleteAdminUserAction failed");
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
    handleActionError(error, "toggleAdminUserTwoFactorAction failed");
  }

  revalidateSettingsPaths();
}

export async function updateSchedulingConfigAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const allowSameDayBooking = formData.get("allowSameDayBooking") === "on";
    const sameDaySurchargePercent = Number(formData.get("sameDaySurchargePercent") ?? 0);
    const globalBookingLookaheadDays = Number(formData.get("globalBookingLookaheadDays") ?? 30);
    const minimumNoticeHours = Number(formData.get("minimumNoticeHours") ?? 2);

    await updateSchedulingConfig({
      allowSameDayBooking,
      sameDaySurchargePercent,
      globalBookingLookaheadDays,
      minimumNoticeHours,
    });

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "scheduling_config_updated",
      entity: "scheduling_config",
      entityId: "singleton",
      after: {
        allowSameDayBooking,
        sameDaySurchargePercent,
        globalBookingLookaheadDays,
        minimumNoticeHours,
      },
    });
  } catch (error) {
    handleActionError(error, "updateSchedulingConfigAction failed");
  }

  revalidateSettingsPaths();
}