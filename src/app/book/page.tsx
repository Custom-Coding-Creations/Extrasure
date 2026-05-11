import { AvailabilityPicker } from "@/components/availability-picker";
import { BookingForm } from "@/components/booking-form";
import { listServiceCatalogItems } from "@/lib/service-catalog";

type BookPageProps = {
  searchParams?: Promise<{ error?: string; cancelled?: string; resumed?: string; continue?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const items = await listServiceCatalogItems(false);
  const activeItems = items.filter((item) => item.active);
  const continueCheckoutUrl = params?.continue;
  const safeContinueCheckoutUrl =
    continueCheckoutUrl &&
    (continueCheckoutUrl.startsWith("https://checkout.stripe.com/") ||
      continueCheckoutUrl.startsWith("https://billing.stripe.com/"))
      ? continueCheckoutUrl
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-[#deceb0] bg-[#fff8ea] p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[#6a5f49]">Fast booking and checkout</p>
        <h1 className="mt-3 font-serif text-3xl text-[#1d2f25] sm:text-4xl">Schedule service in minutes</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#4e5e54] sm:text-base">
          Choose a one-time treatment or recurring plan, pick your preferred service window, and complete secure checkout.
        </p>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-[#c46d3d] bg-[#fff0e8] px-4 py-3 text-sm text-[#7b2f14]">
            {params.error}
          </p>
        ) : null}
        {params?.cancelled ? (
          <p className="mt-4 rounded-xl border border-[#c9b488] bg-[#fff6dd] px-4 py-3 text-sm text-[#5e4a25]">
            Checkout was cancelled. Your service details are still saved for a quick retry.
          </p>
        ) : null}
        {params?.resumed === "1" ? (
          <div className="mt-4 rounded-xl border border-[#3d6d4b] bg-[#ebf7ef] px-4 py-3 text-sm text-[#184428]">
            <p>We found your existing checkout and resumed it to prevent duplicate charges.</p>
            {safeContinueCheckoutUrl ? (
              <a
                href={safeContinueCheckoutUrl}
                className="mt-3 inline-flex rounded-full bg-[#1c5a34] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#144326]"
              >
                Continue existing checkout
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <BookingForm activeItems={activeItems} />
      </div>
    </div>
  );
}
