import Link from "next/link";
import { buildBookingConfirmationContent } from "@/lib/booking-confirmation-content";
import { getBookingConfirmation } from "@/lib/service-booking";
import { trustBadges } from "@/lib/site";

type BookingConfirmationPageProps = {
  searchParams?: Promise<{ booking?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({ searchParams }: BookingConfirmationPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const bookingId = params?.booking ?? "";
  const confirmation = bookingId ? await getBookingConfirmation(bookingId) : null;
  const content = buildBookingConfirmationContent({
    confirmation: confirmation
      ? {
          itemName: confirmation.item?.name,
          preferredDate: confirmation.booking.preferredDate instanceof Date ? confirmation.booking.preferredDate.toISOString() : String(confirmation.booking.preferredDate),
          preferredWindow: confirmation.booking.preferredWindow,
          paid: confirmation.paid,
          bookingId: confirmation.booking.id,
        }
      : null,
    formatDate: (date) => new Date(date).toLocaleDateString(),
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="animated-entry success-glow rounded-3xl border border-[#deceb0] bg-[linear-gradient(165deg,#fff9eb_0%,#f5ead6_56%,#eee0c0_100%)] p-6 shadow-[0_18px_36px_rgba(21,45,34,0.14)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6a5f49]">Booking confirmation</p>
        <h1 className="mt-3 font-serif text-3xl text-[#1d2f25] sm:text-4xl">Your home protection is reserved</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#4f5f55] sm:text-base">
          {content.heroMessage}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="shimmer-line rounded-2xl border border-[#d8c9ac] bg-white/80 p-4">
            {!content.summary ? (
              <p className="text-sm text-[#5d7267]">{content.emptyStateMessage}</p>
            ) : (
              <div className="space-y-3 text-sm text-[#33453a]">
                <p>
                  <span className="font-semibold text-[#1b2f25]">Service:</span> {content.summary.service}
                </p>
                <p>
                  <span className="font-semibold text-[#1b2f25]">Preferred window:</span>{" "}
                  {content.summary.preferredWindow}
                </p>
                <p>
                  <span className="font-semibold text-[#1b2f25]">Status:</span>{" "}
                  {content.summary.status}
                </p>
                <p className="text-xs text-[#5d7267]">Reference: {content.summary.reference}</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[#d8c9ac] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">What happens next</p>
            <ol className="mt-3 space-y-2 text-sm text-[#33453a]">
              {content.nextSteps.map((step, index) => (
                <li key={step} className="rounded-xl border border-[#dcd0b8] bg-[#fff7e8] px-3 py-2">
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {trustBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-[#c9b488] bg-[#f8e8c8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b4928]">
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account"
            className="rounded-full bg-[#163526] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Open My Account
          </Link>
          <Link
            href="/book"
            className="rounded-full border border-[#163526] px-4 py-2 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
          >
            Book another service
          </Link>
        </div>
      </section>
    </div>
  );
}
