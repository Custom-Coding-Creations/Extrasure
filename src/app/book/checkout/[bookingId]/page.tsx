import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StripeCheckoutElementsForm } from "@/components/stripe-checkout-elements-form";
import { getSignedInCustomerFormPrefill } from "@/lib/customer-form-prefill";
import { getBookingConfirmation } from "@/lib/service-booking";

export const dynamic = "force-dynamic";

type BookingCheckoutPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams?: Promise<{
    invoice?: string;
    resumed?: string;
    stripe?: string;
  }>;
};

export default async function BookingCheckoutPage({ params, searchParams }: BookingCheckoutPageProps) {
  const { bookingId } = await params;
  const query = searchParams ? await searchParams : undefined;
  const invoiceId = String(query?.invoice ?? "").trim();
  const signedInPrefill = await getSignedInCustomerFormPrefill();

  if (!invoiceId) {
    notFound();
  }

  const confirmation = await getBookingConfirmation(bookingId);

  if (!confirmation || confirmation.booking.invoiceId !== invoiceId || !confirmation.invoice) {
    notFound();
  }

  if (confirmation.invoice.status === "paid") {
    redirect(`/book/confirmation?booking=${bookingId}&invoice=${invoiceId}&stripe=success`);
  }

  const isResumed = query?.resumed === "1";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.14em] text-[#6a5f49]">Secure checkout</p>
      <h1 className="mt-2 font-serif text-3xl text-[#1d2f25] sm:text-4xl">Complete your booking payment</h1>
      <p className="mt-3 text-sm text-[#4e5e54] sm:text-base">
        Confirm your payment details to lock in your service appointment.
      </p>

      {isResumed ? (
        <div className="mt-4 rounded-xl border border-[#3d6d4b] bg-[#ebf7ef] px-4 py-3 text-sm text-[#184428]">
          We resumed your pending checkout to prevent duplicate charges.
        </div>
      ) : null}

      <section className="paper-panel mt-8 rounded-2xl border border-[#d3c7ad] p-6">
        <dl className="grid gap-3 text-sm text-[#33453a] sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Booking</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{confirmation.booking.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Invoice</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{confirmation.invoice.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Service</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{confirmation.item?.name ?? "Service booking"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Amount due</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">${confirmation.invoice.amount}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <StripeCheckoutElementsForm
            initUrl="/api/book/checkout-elements"
            initPayload={{ bookingId, invoiceId }}
            successPath={`/book/confirmation?booking=${bookingId}&invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`}
            amount={confirmation.invoice.amount}
            title="Payment Details"
            showContactDetails={false}
            defaultValues={{
              billingName: confirmation.booking.contactName || signedInPrefill?.fullName,
              addressLine1: confirmation.booking.addressLine1 || signedInPrefill?.addressLine1,
              addressLine2: confirmation.booking.addressLine2 || signedInPrefill?.addressLine2,
              city: confirmation.booking.city || signedInPrefill?.city,
              postalCode: confirmation.booking.postalCode || signedInPrefill?.postalCode,
              stateProvince: signedInPrefill?.stateProvince,
              country: "US",
            }}
          />
        </div>
      </section>

      <p className="mt-6 text-sm text-[#445349]">
        Need to change service details first? <Link href="/book" className="font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">Return to booking form</Link>.
      </p>
    </div>
  );
}
