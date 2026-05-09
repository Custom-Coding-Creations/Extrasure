import Link from "next/link";
import { CtaStrip } from "@/components/cta-strip";
import { LeadForm } from "@/components/lead-form";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { company, serviceAreas, services, testimonials, trustBadges } from "@/lib/site";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-emerald-900/10 bg-[#133325] text-stone-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(239,220,183,0.28),_transparent_52%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[#efdcb7]">Syracuse Local Experts</p>
            <h1 className="mt-4 text-4xl leading-tight text-[#fff7e5] sm:text-5xl">
              Pest Problems Solved Fast, with Service You Can Trust
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-200">
              ExtraSure Pest Control protects homes, rentals, and businesses across {company.city} and nearby communities with same-day availability, clear communication, and guaranteed follow-through.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <TrackedContactLink
                href={company.phoneHref}
                eventName="call_click"
                eventPayload={{ source: "home_hero" }}
                className="rounded-full bg-[#d48534] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b86d22]"
              >
                {company.ctaPrimary}
              </TrackedContactLink>
              <Link href="/contact" className="rounded-full border border-stone-200/60 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-100 hover:text-[#133325]">
                {company.ctaSecondary}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs text-stone-200">
              {trustBadges.map((badge) => (
                <li key={badge} className="rounded-full border border-stone-300/30 px-3 py-1">
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="paper-panel rounded-3xl border border-[#c0b192] p-6 text-[#203126] shadow-xl shadow-black/15">
            <p className="text-xs uppercase tracking-[0.2em] text-[#5f6d63]">Free Inspection Request</p>
            <h2 className="mt-2 text-2xl">Tell Us What You Are Seeing</h2>
            <p className="mt-2 text-sm text-[#445349]">We respond quickly and route every new request to email, SMS, and dispatch tracking.</p>
            <LeadForm source="home_hero_form" includeEmail={false} includeService={false} compact />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Core Services</p>
            <h2 className="mt-2 text-3xl text-[#15281f]">Built for Real-World Pest Pressure</h2>
          </div>
          <Link href="/services" className="text-sm font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
            View all services
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.slice(0, 8).map((service) => (
            <article key={service.slug} className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
              <h3 className="text-xl text-[#203328]">{service.name}</h3>
              <p className="mt-2 text-sm text-[#445349]">{service.summary}</p>
              <p className="mt-3 text-sm font-semibold text-[#163526]">Starting at {service.startingAt}</p>
              <Link href={`/services/${service.slug}`} className="mt-4 inline-block text-sm font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-emerald-900/10 bg-[#f0e7d2]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Service Area</p>
          <h2 className="mt-2 text-3xl text-[#15281f]">Proudly Serving Syracuse and Surrounding Communities</h2>
          <ul className="mt-6 grid gap-2 text-sm text-[#33453a] sm:grid-cols-2 md:grid-cols-3">
            {serviceAreas.map((area) => (
              <li key={area} className="rounded-xl bg-[#fff9eb] px-3 py-2">{area}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Local Reviews</p>
        <h2 className="mt-2 text-3xl text-[#15281f]">Neighbors Trust ExtraSure</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
              <p className="text-sm leading-6 text-[#33453a]">&quot;{testimonial.quote}&quot;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#5a6b60]">
                {testimonial.name} • {testimonial.area}
              </p>
            </article>
          ))}
        </div>
      </section>

      <CtaStrip />
    </div>
  );
}
