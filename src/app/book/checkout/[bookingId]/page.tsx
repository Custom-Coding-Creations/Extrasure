import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StripeCheckoutElementsForm } from "@/components/stripe-checkout-elements-form";
import { getSignedInCustomerFormPrefill } from "@/lib/customer-form-prefill";
import { getBookingConfirmation } from "@/lib/service-booking";
import { trustBadges } from "@/lib/site";

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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="animated-entry h-fit space-y-4 rounded-3xl border border-[#d4c6a8] bg-[linear-gradient(170deg,#fffaf0_0%,#f5ebd6_60%,#ebddbd_100%)] p-6 shadow-[0_20px_42px_rgba(22,53,38,0.16)] lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d5a40]">Booking summary</p>
          <dl className="space-y-3 text-sm text-[#33453a]">
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-[#5d7267]">Service</dt>
              <dd className="mt-1 text-base font-semibold text-[#1b2f25]">{confirmation.item?.name ?? "Service booking"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-[#5d7267]">Appointment request</dt>
              <dd className="mt-1 text-[#1b2f25]">{new Date(confirmation.booking.preferredDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-[#5d7267]">Amount due now</dt>
              <dd className="mt-1 text-xl font-semibold text-[#1b2f25]">${confirmation.invoice.amount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.1em] text-[#5d7267]">Invoice reference</dt>
              <dd className="mt-1 text-[#1b2f25]">{confirmation.invoice.id}</dd>
            </div>
          </dl>
          <div className="grid gap-2">
            {trustBadges.map((badge) => (
              <p key={badge} className="rounded-full border border-[#c8b58f] bg-[#f7e8c6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5c4a25]">
                {badge}
              </p>
            ))}
          </div>
          <p className="rounded-2xl border border-[#c7d8c8] bg-[#edf8f0] px-3 py-2 text-xs text-[#215336]">
            Secure encrypted checkout. Most customers finish in less than 60 seconds.
          </p>
        </aside>

        <div className="paper-panel rounded-3xl border border-[#d3c7ad] p-6">
          <StripeCheckoutElementsForm
            initUrl="/api/book/checkout-elements"
            initPayload={{ bookingId, invoiceId }}
            successPath={`/book/confirmation?booking=${bookingId}&invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`}
            amount={confirmation.invoice.amount}
            title="Secure payment"
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
