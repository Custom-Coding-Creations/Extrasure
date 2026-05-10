"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-auth";
import {
  createAutomationEvent,
  deleteAutomationEvent,
  setAutomationEventStatus,
  updateAutomationEvent,
} from "@/lib/admin-store";
import type { AutomationEvent } from "@/lib/admin-data";

function getAutomationInput(formData: FormData): Omit<AutomationEvent, "id"> {
  return {
    type: String(formData.get("type") ?? "lead_alert") as AutomationEvent["type"],
    target: String(formData.get("target") ?? ""),
    status: String(formData.get("status") ?? "queued") as AutomationEvent["status"],
    scheduledFor: String(formData.get("scheduledFor") ?? ""),
  };
}

function revalidateAutomationPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/automations");
}

export async function createAutomationAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  await createAutomationEvent(getAutomationInput(formData));
  revalidateAutomationPaths();
}

export async function updateAutomationAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const eventId = String(formData.get("eventId") ?? "").trim();

  await updateAutomationEvent(eventId, getAutomationInput(formData));
  revalidateAutomationPaths();
}

export async function deleteAutomationAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const eventId = String(formData.get("eventId") ?? "").trim();

  await deleteAutomationEvent(eventId);
  revalidateAutomationPaths();
}

export async function markAutomationSentAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const eventId = String(formData.get("eventId") ?? "").trim();

  await setAutomationEventStatus(eventId, "sent");
  revalidateAutomationPaths();
}

export async function markAutomationQueuedAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const eventId = String(formData.get("eventId") ?? "").trim();

  await setAutomationEventStatus(eventId, "queued");
  revalidateAutomationPaths();
}

export async function markAutomationFailedAction(formData: FormData) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const eventId = String(formData.get("eventId") ?? "").trim();

  await setAutomationEventStatus(eventId, "failed");
  revalidateAutomationPaths();
}