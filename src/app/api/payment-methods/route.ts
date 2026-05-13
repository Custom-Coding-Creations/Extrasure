import { NextResponse } from "next/server";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { getCustomerPaymentMethods } from "@/lib/payment-preferences";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [methods, customer] = await Promise.all([
    getCustomerPaymentMethods(session.customerId),
    prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        preferredPaymentMethod: true,
        autopayEnabled: true,
        autopayMethodType: true,
        achDiscountEligible: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    methods,
    preference: customer,
  });
}
