import "server-only";

import { prisma } from "@/lib/prisma";

export type TimelineItem = {
  id: string;
  type: "invoice" | "payment" | "service" | "booking" | "note" | "triage";
  title: string;
  detail: string;
  occurredAt: string;
};

export type CustomerAccountSnapshot = NonNullable<Awaited<ReturnType<typeof getCustomerAccountSnapshot>>>;

export async function getCustomerAccountSnapshot(customerId: string, emailHint?: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      postalCode: true,
      stateProvince: true,
      activePlan: true,
      lifecycle: true,
      lastServiceDate: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  });

  if (!customer) {
    return null;
  }

  const normalizedEmail = (emailHint ?? customer.email).trim().toLowerCase();
  const relatedCustomerIds = normalizedEmail
    ? await prisma.customer.findMany({
        where: {
          email: normalizedEmail,
        },
        select: { id: true },
      })
    : [];

  const customerIds = Array.from(new Set([customerId, ...relatedCustomerIds.map((item) => item.id)]));

  const [invoices, jobs, bookings, notes, triageAssessments] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: { dueDate: "desc" },
      take: 20,
    }),
    prisma.job.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    }),
    prisma.serviceBooking.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.customerNote.findMany({
      where: {
        customerId: { in: customerIds },
        visibility: "customer",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.triageAssessment.findMany({
      where: {
        customerId: { in: customerIds },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

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
    ...triageAssessments.map((assessment) => ({
      id: `triage_${assessment.id}`,
      type: "triage" as const,
      title: `Triage ${assessment.urgency.replace("_", " ")}`,
      detail: `${assessment.likelyPest} · ${Math.round(assessment.confidence * 100)}% confidence`,
      occurredAt: assessment.createdAt.toISOString(),
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
    triageAssessments,
    timeline,
  };
}
