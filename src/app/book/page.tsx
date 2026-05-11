import { startBookingCheckoutAction } from "@/app/book/actions";
import { listServiceCatalogItems } from "@/lib/service-catalog";

type BookPageProps = {
  searchParams?: Promise<{ error?: string; cancelled?: string }>;
};

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const items = await listServiceCatalogItems(false);
  const activeItems = items.filter((item) => item.active);

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
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-[#deceb0] bg-[#fffdf6] p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-[#1d2f25]">1. Select your service</h2>
          <div className="mt-4 space-y-3">
            {activeItems.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-[#e0d2b6] bg-white px-4 py-3 text-sm text-[#33453a]"
              >
                <input
                  type="radio"
                  name="serviceCatalogItemId"
                  value={item.id}
                  form="book-checkout-form"
                  defaultChecked={activeItems[0]?.id === item.id}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-[#1e3026]">{item.name}</span>
                  <span className="mt-1 block text-xs text-[#5d7267]">{item.description}</span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.1em] text-[#5a6f63]">
                    {item.kind === "subscription" ? `${item.billingCycle} plan` : "one-time service"} • ${item.amount}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#deceb0] bg-[#fffdf6] p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-[#1d2f25]">2. Schedule and checkout</h2>
          <form id="book-checkout-form" action={startBookingCheckoutAction} className="mt-4 grid gap-3">
            <input
              name="contactName"
              required
              placeholder="Full name"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="contactEmail"
                type="email"
                required
                placeholder="Email"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <input
                name="contactPhone"
                required
                placeholder="Phone"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="preferredDate"
                type="date"
                required
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <select
                name="preferredWindow"
                defaultValue=""
                required
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              >
                <option value="" disabled>
                  Preferred time window
                </option>
                <option value="morning">Morning (8AM-12PM)</option>
                <option value="midday">Midday (12PM-3PM)</option>
                <option value="afternoon">Afternoon (3PM-6PM)</option>
              </select>
            </div>
            <input
              name="addressLine1"
              required
              placeholder="Service address"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="addressLine2"
                placeholder="Apt / suite (optional)"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <input
                name="city"
                required
                placeholder="City"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="postalCode"
                placeholder="ZIP (optional)"
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
              <textarea
                name="notes"
                placeholder="Gate code, treatment notes, pets, etc."
                className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
              />
            </div>
            <button
              type="submit"
              className="mt-2 rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
            >
              Continue to secure checkout
            </button>
            <p className="text-xs text-[#5d7267]">
              You will complete payment with Stripe and we will confirm technician assignment after purchase.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
