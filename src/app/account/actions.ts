"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCustomerSession, requireCustomerSession } from "@/lib/customer-auth";
import { createBillingPortalSession, setCustomerSubscriptionLifecycle } from "@/lib/stripe-billing";
import { getBaseUrl } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function logoutCustomer() {
  await clearCustomerSession();
  redirect("/account/login");
}

export async function openCustomerBillingPortal() {
  const session = await requireCustomerSession();

  const portal = await createBillingPortalSession(session.customerId, {
    returnUrl: `${getBaseUrl()}/account/billing?stripe=portal_return`,
  });

  redirect(portal.url);
}

export async function createCustomerNote(formData: FormData) {
  const session = await requireCustomerSession();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  await prisma.customerNote.create({
    data: {
      id: `note_${randomUUID()}`,
      customerId: session.customerId,
      authorType: "customer",
      authorName: session.name,
      body,
      visibility: "customer",
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/notes");
  revalidatePath("/account/activity");
}

export async function updateCustomerProfileAction(formData: FormData) {
  const session = await requireCustomerSession();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const stateProvince = String(formData.get("stateProvince") ?? "").trim();

  if (!name || !phone || !city) {
    redirect("/account/profile?status=invalid");
  }

  await prisma.customer.update({
    where: {
      id: session.customerId,
    },
    data: {
      name,
      phone,
      city,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      postalCode: postalCode || null,
      stateProvince: stateProvince || null,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  redirect("/account/profile?status=updated");
}

type SubscriptionAction = "pause" | "resume" | "cancel";

function parseSubscriptionAction(value: string): SubscriptionAction | null {
  if (value === "pause" || value === "resume" || value === "cancel") {
    return value;
  }

  return null;
}

export async function updateCustomerSubscriptionAction(formData: FormData) {
  const session = await requireCustomerSession();
  const action = parseSubscriptionAction(String(formData.get("action") ?? "").trim());

  if (!action) {
    redirect("/account/billing?stripe=subscription_error");
  }

  const result = await setCustomerSubscriptionLifecycle(session.customerId, action);

  revalidatePath("/account");
  revalidatePath("/account/billing");

  if (!result.ok) {
    redirect("/account/billing?stripe=subscription_error");
  }

  redirect(`/account/billing?stripe=subscription_${action}`);
}
