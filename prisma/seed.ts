import { PrismaClient } from "@prisma/client";
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

function toDateTime(value: string) {
  return new Date(value);
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.automationEvent.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.adminUser.deleteMany();

  await prisma.adminUser.createMany({
    data: adminUsers,
  });

  await prisma.customer.createMany({
    data: customers.map((customer) => ({
      ...customer,
      lastServiceDate: toDateTime(customer.lastServiceDate),
    })),
  });

  await prisma.technician.createMany({
    data: technicians,
  });

  await prisma.job.createMany({
    data: jobs.map((job) => ({
      ...job,
      scheduledAt: toDateTime(job.scheduledAt),
    })),
  });

  await prisma.estimate.createMany({
    data: estimates.map((estimate) => ({
      ...estimate,
      createdAt: toDateTime(estimate.createdAt),
    })),
  });

  await prisma.invoice.createMany({
    data: invoices.map((invoice) => ({
      ...invoice,
      dueDate: toDateTime(invoice.dueDate),
    })),
  });

  await prisma.payment.createMany({
    data: payments.map((payment) => ({
      ...payment,
      createdAt: toDateTime(payment.createdAt),
    })),
  });

  await prisma.automationEvent.createMany({
    data: automationEvents.map((event) => ({
      ...event,
      scheduledFor: toDateTime(event.scheduledFor),
    })),
  });

  await prisma.inventoryItem.createMany({
    data: inventory.map((item) => ({
      ...item,
      lastUpdated: toDateTime(item.lastUpdated),
    })),
  });
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
