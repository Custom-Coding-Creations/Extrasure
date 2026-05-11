import { PrismaClient, Role, type BillingCycle, type ServiceCatalogKind } from "@prisma/client";
import {
  adminUsers,
  automationEvents,
  customers,
  estimates,
  inventory,
  invoices,
  jobs,
  payments,
  technicians,
} from "../src/lib/admin-data";

const prisma = new PrismaClient();

const serviceCatalogItems: Array<{
  id: string;
  name: string;
  description: string;
  serviceType: string;
  kind: ServiceCatalogKind;
  billingCycle: BillingCycle;
  amount: number;
  active: boolean;
  sortOrder: number;
}> = [
  {
    id: "svc_monthly_general",
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
    id: "svc_quarterly_shield",
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
    id: "svc_rodent_defense",
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
    id: "svc_mosquito_tick",
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
    id: "svc_termite_monitoring",
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
    id: "svc_one_time_flush",
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

const validRoles: ReadonlyArray<Role> = ["owner", "dispatch", "technician", "accountant"];

function resolveRole(): Role {
  const input = (process.env.ADMIN_LOGIN_ROLE ?? "owner").toLowerCase();
  if (validRoles.includes(input as Role)) {
    return input as Role;
  }

  return "owner";
}

function resolveName() {
  const value = process.env.ADMIN_LOGIN_NAME?.trim();
  return value && value.length > 0 ? value : "Owner";
}

function resolveId() {
  const email = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  if (email && email.length > 0) {
    return `owner:${email}`;
  }

  return "owner:primary";
}

function toDateTime(value: string) {
  return new Date(value);
}

function getLinkedTechnicianId(adminUserId: string) {
  return `tech_admin_${adminUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function normalizeTechnicianName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function syncTechnicianUsersFromAdminUsers() {
  const technicianAdmins = await prisma.adminUser.findMany({
    where: { role: "technician" },
    orderBy: { id: "asc" },
  });

  const existingTechnicians = await prisma.technician.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  const technicianIdByNormalizedName = new Map<string, string>();

  for (const technician of existingTechnicians) {
    const key = normalizeTechnicianName(technician.name);

    if (!technicianIdByNormalizedName.has(key)) {
      technicianIdByNormalizedName.set(key, technician.id);
    }
  }

  for (const adminUser of technicianAdmins) {
    const normalizedName = normalizeTechnicianName(adminUser.name);
    const linkedTechnicianId = getLinkedTechnicianId(adminUser.id);
    const existingTechnicianId = technicianIdByNormalizedName.get(normalizedName);

    if (existingTechnicianId) {
      await prisma.technician.update({
        where: { id: existingTechnicianId },
        data: { name: adminUser.name },
      });

      continue;
    }

    await prisma.technician.upsert({
      where: { id: linkedTechnicianId },
      update: {
        name: adminUser.name,
      },
      create: {
        id: linkedTechnicianId,
        name: adminUser.name,
        status: "available",
        utilizationPercent: 0,
      },
    });

    technicianIdByNormalizedName.set(normalizedName, linkedTechnicianId);
  }
}

async function seedOperationalDataIfEmpty() {
  const [
    adminUserCount,
    customerCount,
    technicianCount,
    jobCount,
    estimateCount,
    invoiceCount,
    paymentCount,
    automationEventCount,
    inventoryCount,
    serviceCatalogCount,
  ] = await Promise.all([
    prisma.adminUser.count(),
    prisma.customer.count(),
    prisma.technician.count(),
    prisma.job.count(),
    prisma.estimate.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.automationEvent.count(),
    prisma.inventoryItem.count(),
    prisma.serviceCatalogItem.count(),
  ]);

  if (adminUserCount === 0) {
    await prisma.adminUser.createMany({ data: adminUsers });
  }

  if (customerCount === 0) {
    await prisma.customer.createMany({
      data: customers.map((customer) => ({
        ...customer,
        lastServiceDate: toDateTime(customer.lastServiceDate),
      })),
    });
  }

  if (technicianCount === 0) {
    await prisma.technician.createMany({ data: technicians });
  }

  if (jobCount === 0) {
    await prisma.job.createMany({
      data: jobs.map((job) => ({
        ...job,
        scheduledAt: toDateTime(job.scheduledAt),
      })),
    });
  }

  if (estimateCount === 0) {
    await prisma.estimate.createMany({
      data: estimates.map((estimate) => ({
        ...estimate,
        createdAt: toDateTime(estimate.createdAt),
      })),
    });
  }

  if (invoiceCount === 0) {
    await prisma.invoice.createMany({
      data: invoices.map((invoice) => ({
        ...invoice,
        dueDate: toDateTime(invoice.dueDate),
      })),
    });
  }

  if (paymentCount === 0) {
    await prisma.payment.createMany({
      data: payments.map((payment) => ({
        ...payment,
        createdAt: toDateTime(payment.createdAt),
      })),
    });
  }

  if (automationEventCount === 0) {
    await prisma.automationEvent.createMany({
      data: automationEvents.map((event) => ({
        ...event,
        scheduledFor: toDateTime(event.scheduledFor),
      })),
    });
  }

  if (inventoryCount === 0) {
    await prisma.inventoryItem.createMany({
      data: inventory.map((item) => ({
        ...item,
        lastUpdated: toDateTime(item.lastUpdated),
      })),
    });
  }

  if (serviceCatalogCount === 0) {
    await prisma.serviceCatalogItem.createMany({
      data: serviceCatalogItems,
    });
  }
}

async function main() {
  await seedOperationalDataIfEmpty();

  const id = resolveId();
  const role = resolveRole();
  const name = resolveName();

  await prisma.adminUser.upsert({
    where: { id },
    update: {
      name,
      role,
    },
    create: {
      id,
      name,
      role,
      twoFactorEnabled: false,
    },
  });

  const total = await prisma.adminUser.count();
  await syncTechnicianUsersFromAdminUsers();
  console.log(`[seed-production] ensured admin user ${id} (${role}); total admin users: ${total}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
