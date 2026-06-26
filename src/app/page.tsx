import Link from "next/link";
import { CtaStrip } from "@/components/cta-strip";
import { LeadForm } from "@/components/lead-form";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { getSignedInCustomerFormPrefill } from "@/lib/customer-form-prefill";
import { company, serviceAreas, services, testimonials, trustBadges } from "@/lib/site";

export default async function Home() {
  const prefill = await getSignedInCustomerFormPrefill();

  return (
    <div>
      <section className="relative overflow-hidden border-b" style={{ borderColor: "rgba(116, 243, 255, 0.32)", background: "linear-gradient(145deg, #0a0317 0%, #160527 55%, #0c0319 100%)", color: "#f6ecff" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,61,184,0.28),_transparent_52%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--brand-sand)" }}>Syracuse Local Experts</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl" style={{ color: "#f9f2ff" }}>
              Pest Problems Solved Fast, with Service You Can Trust
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7" style={{ color: "rgba(238, 223, 255, 0.86)" }}>
              ExtraSure Pest Control protects homes, rentals, and businesses across {company.city} and nearby communities with same-day availability, clear communication, and guaranteed follow-through.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <TrackedContactLink
                href={company.phoneHref}
                eventName="call_click"
                eventPayload={{ source: "home_hero" }}
                className="rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                style={{ background: "var(--brand-accent)" }}
              >
                {company.ctaPrimary}
              </TrackedContactLink>
              <Link href="/contact" className="rounded-full border px-5 py-3 text-sm font-semibold transition hover:bg-white hover:text-[#150a24]" style={{ borderColor: "rgba(116, 243, 255, 0.52)", color: "#d5f7ff" }}>
                {company.ctaSecondary}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs" style={{ color: "rgba(238, 223, 255, 0.84)" }}>
              {trustBadges.map((badge) => (
                <li key={badge} className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(255, 61, 184, 0.34)" }}>
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="paper-panel rounded-3xl border p-6 shadow-xl shadow-black/35" style={{ borderColor: "rgba(116, 243, 255, 0.34)", color: "var(--foreground)" }}>
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(116, 243, 255, 0.78)" }}>Free Inspection Request</p>
            <h2 className="mt-2 text-2xl" style={{ color: "#f9f2ff" }}>Tell Us What You Are Seeing</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(238, 223, 255, 0.8)" }}>We respond quickly and route every new request to email, SMS, and dispatch tracking.</p>
            <LeadForm
              source="home_hero_form"
              includeEmail={false}
              includeService={false}
              compact
              defaults={prefill ? {
                fullName: prefill.fullName,
                phone: prefill.phone,
                addressOrZip: prefill.addressOrZip,
              } : undefined}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(116, 243, 255, 0.78)" }}>Core Services</p>
            <h2 className="mt-2 text-3xl" style={{ color: "#f2e9ff" }}>Built for Real-World Pest Pressure</h2>
          </div>
          <Link href="/services" className="text-sm font-semibold underline underline-offset-4" style={{ color: "#7af5ff", textDecorationColor: "#ff3db8" }}>
            View all services
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.slice(0, 8).map((service) => (
            <article key={service.slug} className="paper-panel rounded-2xl border p-5" style={{ borderColor: "rgba(116, 243, 255, 0.3)" }}>
              <h3 className="text-xl" style={{ color: "#f4ecff" }}>{service.name}</h3>
              <p className="mt-2 text-sm" style={{ color: "rgba(238, 223, 255, 0.74)" }}>{service.summary}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: "#7af5ff" }}>Starting at {service.startingAt}</p>
              <Link href={`/services/${service.slug}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4" style={{ color: "#7af5ff", textDecorationColor: "#ff3db8" }}>
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y" style={{ borderColor: "rgba(255, 61, 184, 0.28)", background: "#10051f" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(116, 243, 255, 0.76)" }}>Service Area</p>
          <h2 className="mt-2 text-3xl" style={{ color: "#f2e9ff" }}>Proudly Serving Syracuse and Surrounding Communities</h2>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-3" style={{ color: "rgba(238, 223, 255, 0.84)" }}>
            {serviceAreas.map((area) => (
              <li key={area} className="rounded-xl border px-3 py-2" style={{ background: "rgba(24, 10, 41, 0.82)", borderColor: "rgba(116, 243, 255, 0.28)" }}>{area}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(116, 243, 255, 0.76)" }}>Local Reviews</p>
        <h2 className="mt-2 text-3xl" style={{ color: "#f2e9ff" }}>Neighbors Trust ExtraSure</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border p-5" style={{ borderColor: "rgba(255, 61, 184, 0.3)", background: "rgba(22, 9, 36, 0.78)" }}>
              <p className="text-sm leading-6" style={{ color: "rgba(238, 223, 255, 0.84)" }}>&quot;{testimonial.quote}&quot;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(116, 243, 255, 0.72)" }}>
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
