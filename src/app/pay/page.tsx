import Link from "next/link";

export const dynamic = "force-dynamic";

type PayPageProps = {
  searchParams?: Promise<{
    error?: string;
    token?: string;
  }>;
};

export default async function PayPage({ searchParams }: PayPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const hasError = params?.error === "not_found";
  const hasExpiredError = params?.error === "expired";
  const hasRateLimitedError = params?.error === "rate_limited";
  const priorToken = params?.token;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Customer Billing</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Pay Your Invoice</h1>
      <p className="mt-4 max-w-2xl text-[#33453a]">
        Enter the invoice ID and billing email exactly as shown on your invoice to securely continue to payment.
      </p>

      {hasError ? (
        <section className="mt-6 rounded-2xl border border-[#d5bcb6] bg-[#fff1ec] p-4 text-sm text-[#7b2f1b]">
          We could not match that invoice and email. Double-check your details or call our office for help.
        </section>
      ) : null}

      {hasExpiredError ? (
        <section className="mt-6 rounded-2xl border border-[#dec3a9] bg-[#fff4e8] p-4 text-sm text-[#7b3d13]">
          Your secure payment link expired. Re-enter your invoice details below to generate a fresh link.
        </section>
      ) : null}

      {hasRateLimitedError ? (
        <section className="mt-6 rounded-2xl border border-[#dec3a9] bg-[#fff4e8] p-4 text-sm text-[#7b3d13]">
          Too many attempts in a short time. Please wait a minute and try again.
        </section>
      ) : null}

      <section className="paper-panel mt-8 rounded-2xl border border-[#d3c7ad] p-6">
        <form action="/pay/access" method="post" className="space-y-4">
          {priorToken ? <input type="hidden" name="token" value={priorToken} /> : null}
          <label className="block text-sm font-medium text-[#23392d]" htmlFor="invoiceId">
            Invoice ID
          </label>
          <input
            id="invoiceId"
            name="invoiceId"
            required
            className="w-full rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-[#1d2f25] outline-none transition focus:border-[#163526]"
            placeholder="inv_12345"
          />

          <label className="block text-sm font-medium text-[#23392d]" htmlFor="email">
            Billing Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-[#1d2f25] outline-none transition focus:border-[#163526]"
            placeholder="you@example.com"
          />

          <button
            type="submit"
            className="rounded-full bg-[#163526] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Continue to Secure Payment
          </button>
        </form>
      </section>

      <p className="mt-6 text-sm text-[#445349]">
        Looking to book new service instead? <Link href="/contact" className="font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">Request a free inspection</Link>.
      </p>
    </div>
  );
}
