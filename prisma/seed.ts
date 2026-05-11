import { PrismaClient, type BillingCycle, type ServiceCatalogKind } from "@prisma/client";
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

function toDateTime(value: string) {
  return new Date(value);
}

async function main() {
  await prisma.serviceBooking.deleteMany();
  await prisma.serviceCatalogItem.deleteMany();
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

  await prisma.serviceCatalogItem.createMany({
    data: serviceCatalogItems,
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
