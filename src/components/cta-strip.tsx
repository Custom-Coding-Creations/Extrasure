import Link from "next/link";
import { company } from "@/lib/site";

export function CtaStrip() {
  return (
    <section className="mx-auto mt-14 w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-900/20 bg-[#163526] p-8 text-stone-100 shadow-lg shadow-emerald-950/20 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#efdcb7]">Need Help Fast?</p>
          <h2 className="mt-2 font-serif text-2xl">Same-Day Help in Syracuse and Nearby Areas</h2>
          <p className="mt-2 max-w-xl text-sm text-stone-300">Free inspections, honest recommendations, and guaranteed follow-through from a local team.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
          <a href={company.phoneHref} className="rounded-full bg-[#d48534] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b86d22]">
            {company.ctaPrimary}
          </a>
          <Link href="/contact" className="rounded-full border border-stone-400/50 px-5 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-100 hover:text-[#163526]">
            {company.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
