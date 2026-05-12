import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getPaymentClientSecret } from "@/lib/stripe-billing";

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const body = await request.json();
    const bookingId = String(body.bookingId ?? "").trim();
    const invoiceId = String(body.invoiceId ?? "").trim();

    if (!bookingId || !invoiceId) {
      return NextResponse.json({ error: "bookingId and invoiceId are required" }, { status: 400 });
    }

    const limit = checkRateLimit(`book-elements:${bookingId}:${ip}`, 10, 60_000);

    if (!limit.ok) {
      return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
    }

    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        invoiceId: true,
        status: true,
      },
    });

    if (!booking || booking.invoiceId !== invoiceId) {
      return NextResponse.json({ error: "Booking checkout was not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking is no longer active" }, { status: 409 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: booking.invoiceId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid" || invoice.status === "refunded") {
      return NextResponse.json({ error: "Invoice is not eligible for checkout" }, { status: 409 });
    }

    const result = await getPaymentClientSecret(invoice.id, {
      context: "customer",
      returnPath: `/book/confirmation?booking=${booking.id}&invoice=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({
      ok: true,
      clientSecret: result.clientSecret,
      sessionId: result.sessionId,
      type: result.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
