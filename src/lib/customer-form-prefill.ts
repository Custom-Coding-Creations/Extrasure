import "server-only";

import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export type CustomerFormPrefill = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  stateProvince: string;
  addressOrZip: string;
};

export async function getSignedInCustomerFormPrefill(): Promise<CustomerFormPrefill | null> {
  const session = await getCustomerSession();

  if (!session) {
    return null;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
    },
  });

  if (!customer) {
    return null;
  }

  const normalizedEmail = (session.email || customer.email).trim().toLowerCase();
  const relatedCustomerIds = normalizedEmail
    ? await prisma.customer.findMany({
        where: { email: normalizedEmail },
        select: { id: true },
      })
    : [];

  const customerIds = Array.from(new Set([customer.id, ...relatedCustomerIds.map((item) => item.id)]));

  const latestBooking = await prisma.serviceBooking.findFirst({
    where: {
      customerId: { in: customerIds },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      postalCode: true,
      stateProvince: true,
    },
  });

  const fullName = customer.name || session.name || latestBooking?.contactName || "";
  const email = customer.email || session.email || latestBooking?.contactEmail || "";
  const phone = customer.phone || latestBooking?.contactPhone || "";
  const city = latestBooking?.city || customer.city || "";
  const addressLine1 = latestBooking?.addressLine1 || "";
  const addressLine2 = latestBooking?.addressLine2 || "";
  const postalCode = latestBooking?.postalCode || "";
  const stateProvince = latestBooking?.stateProvince || "";
  const addressOrZip = addressLine1 || postalCode || city;

  return {
    fullName,
    email,
    phone,
    city,
    addressLine1,
    addressLine2,
    postalCode,
    stateProvince,
    addressOrZip,
  };
}