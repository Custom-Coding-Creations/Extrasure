"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireAdminRole } from "@/lib/admin-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import {
  createManualSecret,
  deleteManualSecret,
  updateManualSecret,
} from "@/lib/admin-manual-store";

function revalidateManualPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/manual");
}

function handleActionError(error: unknown, context: string) {
  if (isRedirectError(error)) {
    throw error;
  }

  console.error(`[admin/manual] ${context}`, error);
}

function readInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    platform: String(formData.get("platform") ?? ""),
    category: String(formData.get("category") ?? ""),
    portalUrl: String(formData.get("portalUrl") ?? ""),
    username: String(formData.get("username") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    secretValue: String(formData.get("secretValue") ?? ""),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createManualSecretAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const created = await createManualSecret(readInput(formData));

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "manual_secret_created",
      entity: "admin_manual_secret",
      entityId: created.id,
      after: {
        title: created.title,
        platform: created.platform,
        category: created.category,
      },
    });
  } catch (error) {
    handleActionError(error, "createManualSecretAction failed");
  }

  revalidateManualPaths();
}

export async function updateManualSecretAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const secretId = String(formData.get("secretId") ?? "").trim();
    const updated = await updateManualSecret(secretId, readInput(formData));

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "manual_secret_updated",
      entity: "admin_manual_secret",
      entityId: updated.id,
      after: {
        title: updated.title,
        platform: updated.platform,
        category: updated.category,
      },
    });
  } catch (error) {
    handleActionError(error, "updateManualSecretAction failed");
  }

  revalidateManualPaths();
}

export async function deleteManualSecretAction(formData: FormData) {
  try {
    const session = await requireAdminRole(["owner"]);
    const secretId = String(formData.get("secretId") ?? "").trim();
    await deleteManualSecret(secretId);

    await recordAuditEvent({
      actor: session.name,
      role: session.role,
      action: "manual_secret_deleted",
      entity: "admin_manual_secret",
      entityId: secretId,
    });
  } catch (error) {
    handleActionError(error, "deleteManualSecretAction failed");
  }

  revalidateManualPaths();
}
