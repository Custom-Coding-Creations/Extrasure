"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditEvent } from "@/lib/audit-log";
import { createBookingCheckout } from "@/lib/service-booking";

async function getActionIpKey() {
  const headerStore = await headers();
  const xff = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const cfIp = headerStore.get("cf-connecting-ip")?.trim();

  return cfIp || realIp || xff || "unknown";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to start checkout right now.";
}

export async function startBookingCheckoutAction(formData: FormData) {
  const ip = await getActionIpKey();
  const limit = checkRateLimit(`book-checkout:${ip}`, 12, 60_000);

  if (!limit.ok) {
    redirect("/book?error=Too+many+attempts.+Please+wait+a+minute.");
  }

  try {
    const result = await createBookingCheckout({
      serviceCatalogItemId: String(formData.get("serviceCatalogItemId") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      preferredDate: String(formData.get("preferredDate") ?? ""),
      preferredWindow: String(formData.get("preferredWindow") ?? ""),
      preferredDateTime: String(formData.get("preferredDateTime") ?? ""),
      preferredTechnicianId: String(formData.get("preferredTechnicianId") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      stateProvince: String(formData.get("stateProvince") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      marketingConsent: formData.get("marketingConsent") === "on",
    });

    await recordAuditEvent({
      actor: "public",
      role: "customer",
      action: "service_booking_created",
      entity: "service_booking",
      entityId: result.bookingId,
      after: {
        invoiceId: result.invoiceId,
      },
    });

    const destination = result.reusedCheckout
      ? `${result.checkoutUrl}${result.checkoutUrl.includes("?") ? "&" : "?"}resumed=1`
      : result.checkoutUrl;

    redirect(destination);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message = encodeURIComponent(getErrorMessage(error));
    redirect(`/book?error=${message}`);
  }
}
