import { PrismaClient, Role } from "@prisma/client";
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
  ]);

  if (adminUserCount === 0) {
    await prisma.adminUser.createMany({ data: adminUsers, skipDuplicates: true });
  }

  if (customerCount === 0) {
    await prisma.customer.createMany({
      data: customers.map((customer) => ({
        ...customer,
        lastServiceDate: toDateTime(customer.lastServiceDate),
      })),
      skipDuplicates: true,
    });
  }

  if (technicianCount === 0) {
    await prisma.technician.createMany({ data: technicians, skipDuplicates: true });
  }

  if (jobCount === 0) {
    await prisma.job.createMany({
      data: jobs.map((job) => ({
        ...job,
        scheduledAt: toDateTime(job.scheduledAt),
      })),
      skipDuplicates: true,
    });
  }

  if (estimateCount === 0) {
    await prisma.estimate.createMany({
      data: estimates.map((estimate) => ({
        ...estimate,
        createdAt: toDateTime(estimate.createdAt),
      })),
      skipDuplicates: true,
    });
  }

  if (invoiceCount === 0) {
    await prisma.invoice.createMany({
      data: invoices.map((invoice) => ({
        ...invoice,
        dueDate: toDateTime(invoice.dueDate),
      })),
      skipDuplicates: true,
    });
  }

  if (paymentCount === 0) {
    await prisma.payment.createMany({
      data: payments.map((payment) => ({
        ...payment,
        createdAt: toDateTime(payment.createdAt),
      })),
      skipDuplicates: true,
    });
  }

  if (automationEventCount === 0) {
    await prisma.automationEvent.createMany({
      data: automationEvents.map((event) => ({
        ...event,
        scheduledFor: toDateTime(event.scheduledFor),
      })),
      skipDuplicates: true,
    });
  }

  if (inventoryCount === 0) {
    await prisma.inventoryItem.createMany({
      data: inventory.map((item) => ({
        ...item,
        lastUpdated: toDateTime(item.lastUpdated),
      })),
      skipDuplicates: true,
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
