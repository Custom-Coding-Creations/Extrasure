import Link from "next/link";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { company } from "@/lib/site";

export function CtaStrip() {
  return (
    <section className="mx-auto mt-14 w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border p-8 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-8" style={{ borderColor: "rgba(198, 224, 255, 0.34)", background: "linear-gradient(145deg, #124482 0%, #12639c 100%)", color: "#eaf4ff" }}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--brand-sand)" }}>Need Help Fast?</p>
          <h2 className="mt-2 font-serif text-2xl">Same-Day Help in Syracuse and Nearby Areas</h2>
          <p className="mt-2 max-w-xl text-sm" style={{ color: "rgba(234, 244, 255, 0.84)" }}>Free inspections, honest recommendations, and guaranteed follow-through from a local team.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
          <TrackedContactLink
            href={company.phoneHref}
            eventName="call_click"
            eventPayload={{ source: "cta_strip" }}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            style={{ background: "var(--brand-accent)" }}
          >
            {company.ctaPrimary}
          </TrackedContactLink>
          <Link href="/contact" className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-white hover:text-[#124482]" style={{ borderColor: "rgba(234, 244, 255, 0.44)", color: "#eaf4ff" }}>
            {company.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
