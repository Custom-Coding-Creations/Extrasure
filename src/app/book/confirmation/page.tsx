import Link from "next/link";
import { getBookingConfirmation } from "@/lib/service-booking";

type BookingConfirmationPageProps = {
  searchParams?: Promise<{ booking?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({ searchParams }: BookingConfirmationPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const bookingId = params?.booking ?? "";
  const confirmation = bookingId ? await getBookingConfirmation(bookingId) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[#deceb0] bg-[#fff8ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6a5f49]">Booking confirmation</p>
        <h1 className="mt-3 font-serif text-3xl text-[#1d2f25] sm:text-4xl">Thanks for booking with ExtraSure</h1>
        {!confirmation ? (
          <p className="mt-4 text-sm text-[#5d7267]">We could not find your booking details yet. If checkout just completed, refresh in a moment.</p>
        ) : (
          <div className="mt-5 space-y-3 text-sm text-[#33453a]">
            <p>
              <span className="font-semibold text-[#1b2f25]">Service:</span> {confirmation.item?.name ?? "Requested service"}
            </p>
            <p>
              <span className="font-semibold text-[#1b2f25]">Preferred window:</span>{" "}
              {new Date(confirmation.booking.preferredDate).toLocaleDateString()} · {confirmation.booking.preferredWindow}
            </p>
            <p>
              <span className="font-semibold text-[#1b2f25]">Status:</span>{" "}
              {confirmation.paid ? "Payment received" : "Payment processing"}
            </p>
            <p className="text-xs text-[#5d7267]">
              Reference: {confirmation.booking.id}
            </p>
          </div>
        )}
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
