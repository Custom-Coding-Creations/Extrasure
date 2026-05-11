import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { ActivePlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createInvoiceCheckoutSession } from "@/lib/stripe-billing";
import { ensureServiceCatalogSeeded } from "@/lib/service-catalog";

export type BookingCheckoutInput = {
  serviceCatalogItemId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredDate: string;
  preferredWindow: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  notes?: string;
};

export type BookingCheckoutResult = {
  bookingId: string;
  invoiceId: string;
  checkoutUrl: string;
  reusedCheckout: boolean;
};

const BOOKING_IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;

function normalizeInput(input: BookingCheckoutInput) {
  const serviceCatalogItemId = input.serviceCatalogItemId.trim();
  const contactName = input.contactName.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const contactPhone = input.contactPhone.trim();
  const preferredDate = input.preferredDate.trim();
  const preferredWindow = input.preferredWindow.trim();
  const addressLine1 = input.addressLine1.trim();
  const addressLine2 = input.addressLine2?.trim() || null;
  const city = input.city.trim();
  const postalCode = input.postalCode?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!serviceCatalogItemId || !contactName || !contactEmail || !contactPhone || !preferredDate || !preferredWindow || !addressLine1 || !city) {
    throw new Error("Service, contact details, schedule preference, and address are required.");
  }

  if (!contactEmail.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }

  const parsedPreferredDate = new Date(preferredDate);

  if (Number.isNaN(parsedPreferredDate.getTime())) {
    throw new Error("Preferred date is invalid.");
  }

  const floorDate = new Date();
  floorDate.setHours(0, 0, 0, 0);

  if (parsedPreferredDate < floorDate) {
    throw new Error("Preferred date cannot be in the past.");
  }

  return {
    serviceCatalogItemId,
    contactName,
    contactEmail,
    contactPhone,
    preferredDate: parsedPreferredDate,
    preferredWindow,
    addressLine1,
    addressLine2,
    city,
    postalCode,
    notes,
  };
}

function mapBillingCycleToPlan(cycle: "one_time" | "monthly" | "quarterly" | "annual"): ActivePlan {
  if (cycle === "monthly") {
    return "monthly";
  }

  if (cycle === "quarterly") {
    return "quarterly";
  }

  if (cycle === "annual") {
    return "annual";
  }

  return "none";
}

function createBookingIdempotencyKey(input: ReturnType<typeof normalizeInput>) {
  const bucket = Math.floor(Date.now() / BOOKING_IDEMPOTENCY_WINDOW_MS);
  const normalizedDate = input.preferredDate.toISOString().slice(0, 10);
  const raw = [
    input.serviceCatalogItemId,
    input.contactEmail,
    input.contactPhone,
    normalizedDate,
    input.preferredWindow,
    input.addressLine1.toLowerCase(),
    input.city.toLowerCase(),
    bucket,
  ].join("|");

  return createHash("sha256").update(raw).digest("hex");
}

async function getReusableCheckoutForIdempotencyKey(idempotencyKey: string): Promise<BookingCheckoutResult | null> {
  const existing = await prisma.serviceBooking.findFirst({
    where: {
      idempotencyKey,
      createdAt: {
        gte: new Date(Date.now() - BOOKING_IDEMPOTENCY_WINDOW_MS),
      },
      status: {
        in: ["checkout_pending", "checkout_completed", "requested"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!existing?.invoiceId) {
    return null;
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: existing.invoiceId,
    },
  });

  if (!invoice || invoice.status === "paid" || invoice.status === "refunded" || !invoice.checkoutUrl) {
    return null;
  }

  return {
    bookingId: existing.id,
    invoiceId: existing.invoiceId,
    checkoutUrl: invoice.checkoutUrl,
    reusedCheckout: true,
  };
}

async function findOrCreateCustomerByEmail(input: ReturnType<typeof normalizeInput>) {
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      email: input.contactEmail,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  return prisma.customer.create({
    data: {
      id: `c_${randomUUID()}`,
      name: input.contactName,
      phone: input.contactPhone,
      email: input.contactEmail,
      city: input.city,
      activePlan: "none",
      lifecycle: "lead",
      lastServiceDate: new Date(),
    },
  });
}

export async function createBookingCheckout(input: BookingCheckoutInput): Promise<BookingCheckoutResult> {
  await ensureServiceCatalogSeeded();
  const normalized = normalizeInput(input);
  const idempotencyKey = createBookingIdempotencyKey(normalized);

  const reusableCheckout = await getReusableCheckoutForIdempotencyKey(idempotencyKey);

  if (reusableCheckout) {
    return reusableCheckout;
  }

  const item = await prisma.serviceCatalogItem.findUnique({
    where: {
      id: normalized.serviceCatalogItemId,
    },
  });

  if (!item || !item.active) {
    throw new Error("Selected service is unavailable.");
  }

  const customer = await findOrCreateCustomerByEmail(normalized);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoice = await prisma.invoice.create({
    data: {
      id: `inv_${randomUUID()}`,
      customerId: customer.id,
      estimateId: null,
      amount: item.amount,
      dueDate,
      status: "open",
      billingCycle: item.billingCycle,
    },
  });

  let booking;

  try {
    booking = await prisma.serviceBooking.create({
      data: {
        id: `book_${randomUUID()}`,
        customerId: customer.id,
        serviceCatalogItemId: item.id,
        invoiceId: invoice.id,
        idempotencyKey,
        contactName: normalized.contactName,
        contactEmail: normalized.contactEmail,
        contactPhone: normalized.contactPhone,
        preferredDate: normalized.preferredDate,
        preferredWindow: normalized.preferredWindow,
        addressLine1: normalized.addressLine1,
        addressLine2: normalized.addressLine2,
        city: normalized.city,
        postalCode: normalized.postalCode,
        notes: normalized.notes,
        status: "checkout_pending",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const recoveredCheckout = await getReusableCheckoutForIdempotencyKey(idempotencyKey);

      if (recoveredCheckout) {
        return recoveredCheckout;
      }
    }

    throw error;
  }

  const checkoutSession = await createInvoiceCheckoutSession(invoice.id, {
    context: "customer",
    successPath: `/book/confirmation?booking=${booking.id}&invoice=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancelPath: `/book?booking=${booking.id}&cancelled=1`,
  });

  await prisma.$transaction(async (tx) => {
    await tx.serviceBooking.update({
      where: { id: booking.id },
      data: {
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    if (item.billingCycle !== "one_time") {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          activePlan: mapBillingCycleToPlan(item.billingCycle),
          lifecycle: "active",
        },
      });
    }
  });

  return {
    bookingId: booking.id,
    invoiceId: invoice.id,
    checkoutUrl: checkoutSession.url as string,
    reusedCheckout: false,
  };
}

export async function getBookingConfirmation(bookingId: string) {
  if (!bookingId.trim()) {
    return null;
  }

  const booking = await prisma.serviceBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return null;
  }

  const [item, invoice, customer] = await Promise.all([
    prisma.serviceCatalogItem.findUnique({ where: { id: booking.serviceCatalogItemId } }),
    booking.invoiceId ? prisma.invoice.findUnique({ where: { id: booking.invoiceId } }) : null,
    prisma.customer.findUnique({ where: { id: booking.customerId } }),
  ]);

  const paid = invoice?.status === "paid";

  if (paid && booking.status === "checkout_pending") {
    await prisma.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: "checkout_completed",
        paidAt: new Date(),
      },
    });
  }

  return {
    booking,
    item,
    invoice,
    customer,
    paid,
  };
}
