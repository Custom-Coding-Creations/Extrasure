import "server-only";

import { prisma } from "@/lib/prisma";

type TimelineItem = {
  id: string;
  type: "invoice" | "payment" | "service" | "booking" | "note";
  title: string;
  detail: string;
  occurredAt: string;
};

export async function getCustomerAccountSnapshot(customerId: string) {
  const [customer, invoices, jobs, bookings, notes] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        activePlan: true,
        lifecycle: true,
        lastServiceDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
      },
    }),
    prisma.invoice.findMany({
      where: { customerId },
      orderBy: { dueDate: "desc" },
      take: 20,
    }),
    prisma.job.findMany({
      where: { customerId },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    }),
    prisma.serviceBooking.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.customerNote.findMany({
      where: {
        customerId,
        visibility: "customer",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!customer) {
    return null;
  }

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const payments = invoiceIds.length
    ? await prisma.payment.findMany({
        where: {
          invoiceId: {
            in: invoiceIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      })
    : [];

  const timeline: TimelineItem[] = [
    ...invoices.map((invoice) => ({
      id: `invoice_${invoice.id}_${invoice.paymentStatusUpdatedAt?.toISOString() ?? invoice.dueDate.toISOString()}`,
      type: "invoice" as const,
      title: `Invoice ${invoice.id}`,
      detail: `${invoice.status.replace("_", " ")} · $${invoice.amount}`,
      occurredAt: (invoice.paymentStatusUpdatedAt ?? invoice.dueDate).toISOString(),
    })),
    ...payments.map((payment) => ({
      id: `payment_${payment.id}`,
      type: "payment" as const,
      title: `Payment ${payment.status.replace("_", " ")}`,
      detail: `${payment.method.toUpperCase()} · $${payment.amount}`,
      occurredAt: payment.createdAt.toISOString(),
    })),
    ...jobs.map((job) => ({
      id: `job_${job.id}`,
      type: "service" as const,
      title: `Service ${job.status.replace("_", " ")}`,
      detail: `${job.service}`,
      occurredAt: job.scheduledAt.toISOString(),
    })),
    ...bookings.map((booking) => ({
      id: `booking_${booking.id}`,
      type: "booking" as const,
      title: `Booking ${booking.status.replace("_", " ")}`,
      detail: `${booking.preferredWindow} · ${booking.city}`,
      occurredAt: booking.createdAt.toISOString(),
    })),
    ...notes.map((note) => ({
      id: `note_${note.id}`,
      type: "note" as const,
      title: `Message from ${note.authorName}`,
      detail: note.body,
      occurredAt: note.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt)))
    .slice(0, 40);

  return {
    customer,
    invoices,
    payments,
    jobs,
    bookings,
    notes,
    timeline,
  };
}
