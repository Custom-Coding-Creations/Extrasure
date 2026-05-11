import { randomUUID } from "node:crypto";
import type { BillingCycle, ServiceCatalogItem, ServiceCatalogKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ServiceCatalogItemInput = {
  name: string;
  description: string;
  serviceType: string;
  kind: ServiceCatalogKind;
  billingCycle: BillingCycle;
  amount: number;
  active: boolean;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  sortOrder: number;
  durationMinutes?: number;
  bookingLookaheadDays?: number;
};

const starterCatalog: ServiceCatalogItemInput[] = [
  {
    name: "Monthly General Pest Protection",
    description: "Year-round interior and exterior pest prevention with recurring monitoring.",
    serviceType: "general_pest",
    kind: "subscription",
    billingCycle: "monthly",
    amount: 109,
    active: true,
    sortOrder: 10,
  },
  {
    name: "Quarterly Home Shield",
    description: "Comprehensive quarterly treatments to stop seasonal pest pressure.",
    serviceType: "general_pest",
    kind: "subscription",
    billingCycle: "quarterly",
    amount: 299,
    active: true,
    sortOrder: 20,
  },
  {
    name: "Rodent Defense Plan",
    description: "Monitoring, exclusion checks, and bait station service for rodent control.",
    serviceType: "rodent",
    kind: "subscription",
    billingCycle: "monthly",
    amount: 129,
    active: true,
    sortOrder: 30,
  },
  {
    name: "Mosquito + Tick Seasonal Add-on",
    description: "Warm-season yard barrier applications for mosquito and tick reduction.",
    serviceType: "mosquito_tick",
    kind: "subscription",
    billingCycle: "quarterly",
    amount: 149,
    active: true,
    sortOrder: 40,
  },
  {
    name: "Termite Monitoring Plan",
    description: "Scheduled termite station checks and annual protection reporting.",
    serviceType: "termite",
    kind: "subscription",
    billingCycle: "annual",
    amount: 780,
    active: true,
    sortOrder: 50,
  },
  {
    name: "One-Time Initial Pest Flush",
    description: "Single-visit service for urgent active pest pressure and treatment setup.",
    serviceType: "general_pest",
    kind: "one_time",
    billingCycle: "one_time",
    amount: 189,
    active: true,
    sortOrder: 5,
  },
];

function normalizeInput(input: ServiceCatalogItemInput): ServiceCatalogItemInput {
  const name = input.name.trim();
  const description = input.description.trim();
  const serviceType = input.serviceType.trim();
  const amount = Number(input.amount);
  const sortOrder = Number(input.sortOrder);
  const durationMinutes = Number(input.durationMinutes ?? 90);
  const bookingLookaheadDays = Number(input.bookingLookaheadDays ?? 30);

  if (!name || !description || !serviceType) {
    throw new Error("Name, description, and service type are required.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (!Number.isFinite(sortOrder)) {
    throw new Error("Sort order must be a number.");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
    throw new Error("Duration must be at least 15 minutes.");
  }

  if (!Number.isFinite(bookingLookaheadDays) || bookingLookaheadDays < 1 || bookingLookaheadDays > 365) {
    throw new Error("Booking lookahead must be between 1 and 365 days.");
  }

  if (input.kind === "one_time" && input.billingCycle !== "one_time") {
    throw new Error("One-time catalog items must use one_time billing cycle.");
  }

  if (input.kind === "subscription" && input.billingCycle === "one_time") {
    throw new Error("Subscription catalog items must use a recurring billing cycle.");
  }

  return {
    name,
    description,
    serviceType,
    kind: input.kind,
    billingCycle: input.billingCycle,
    amount: Math.round(amount),
    active: Boolean(input.active),
    stripeProductId: input.stripeProductId?.trim() || null,
    stripePriceId: input.stripePriceId?.trim() || null,
    sortOrder: Math.round(sortOrder),
    durationMinutes: Math.round(durationMinutes),
    bookingLookaheadDays: Math.round(bookingLookaheadDays),
  };
}

export async function ensureServiceCatalogSeeded() {
  const count = await prisma.serviceCatalogItem.count();

  if (count > 0) {
    return;
  }

  await prisma.serviceCatalogItem.createMany({
    data: starterCatalog.map((item, index) => ({
      id: `svc_${Date.now()}_${index}`,
      ...item,
    })),
  });
}

export async function listServiceCatalogItems(includeInactive = true): Promise<ServiceCatalogItem[]> {
  await ensureServiceCatalogSeeded();

  return prisma.serviceCatalogItem.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createServiceCatalogItem(input: ServiceCatalogItemInput) {
  const data = normalizeInput(input);

  return prisma.serviceCatalogItem.create({
    data: {
      id: `svc_${randomUUID()}`,
      ...data,
    },
  });
}

export async function updateServiceCatalogItem(id: string, input: ServiceCatalogItemInput) {
  if (!id.trim()) {
    throw new Error("Service catalog item id is required.");
  }

  const data = normalizeInput(input);

  return prisma.serviceCatalogItem.update({
    where: { id },
    data,
  });
}

export async function deleteOrDeactivateServiceCatalogItem(id: string) {
  if (!id.trim()) {
    throw new Error("Service catalog item id is required.");
  }

  const bookingCount = await prisma.serviceBooking.count({ where: { serviceCatalogItemId: id } });

  if (bookingCount > 0) {
    const item = await prisma.serviceCatalogItem.update({
      where: { id },
      data: { active: false },
    });

    return {
      mode: "deactivated" as const,
      item,
    };
  }

  const item = await prisma.serviceCatalogItem.delete({ where: { id } });

  return {
    mode: "deleted" as const,
    item,
  };
}
