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
      <section className="relative overflow-hidden border-b" style={{ borderColor: "rgba(255, 255, 255, 0.7)", background: "linear-gradient(145deg, #dde5ef 0%, #e8edf4 55%, #dfe7f0 100%)", color: "#44596f" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_52%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--brand-sand)" }}>Syracuse Local Experts</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl" style={{ color: "#304256" }}>
              Pest Problems Solved Fast, with Service You Can Trust
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7" style={{ color: "rgba(68, 89, 111, 0.84)" }}>
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
              <Link href="/contact" className="rounded-full border px-5 py-3 text-sm font-semibold transition hover:bg-white hover:text-[#44596f]" style={{ borderColor: "rgba(255,255,255,0.8)", color: "#44596f", background: "#e8edf4", boxShadow: "var(--shadow-sm)" }}>
                {company.ctaSecondary}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs" style={{ color: "rgba(68, 89, 111, 0.78)" }}>
              {trustBadges.map((badge) => (
                <li key={badge} className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(255,255,255,0.8)", background: "#e8edf4", boxShadow: "var(--shadow-sm)" }}>
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="paper-panel rounded-3xl border p-6 shadow-xl shadow-black/15" style={{ borderColor: "rgba(47, 36, 29, 0.2)", color: "var(--foreground)" }}>
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(47, 36, 29, 0.64)" }}>Free Inspection Request</p>
            <h2 className="mt-2 text-2xl" style={{ color: "#2b211b" }}>Tell Us What You Are Seeing</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(47, 36, 29, 0.74)" }}>We respond quickly and route every new request to email, SMS, and dispatch tracking.</p>
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
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(47, 36, 29, 0.64)" }}>Core Services</p>
            <h2 className="mt-2 text-3xl" style={{ color: "#2b211b" }}>Built for Real-World Pest Pressure</h2>
          </div>
          <Link href="/services" className="text-sm font-semibold underline underline-offset-4" style={{ color: "#2f241d", textDecorationColor: "#ae8051" }}>
            View all services
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.slice(0, 8).map((service) => (
            <article key={service.slug} className="paper-panel rounded-2xl border p-5" style={{ borderColor: "rgba(47, 36, 29, 0.17)" }}>
              <h3 className="text-xl" style={{ color: "#2b211b" }}>{service.name}</h3>
              <p className="mt-2 text-sm" style={{ color: "rgba(47, 36, 29, 0.74)" }}>{service.summary}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: "#2f241d" }}>Starting at {service.startingAt}</p>
              <Link href={`/services/${service.slug}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4" style={{ color: "#2f241d", textDecorationColor: "#ae8051" }}>
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y" style={{ borderColor: "rgba(47, 36, 29, 0.14)", background: "#efe3d2" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(47, 36, 29, 0.64)" }}>Service Area</p>
          <h2 className="mt-2 text-3xl" style={{ color: "#2b211b" }}>Proudly Serving Syracuse and Surrounding Communities</h2>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-3" style={{ color: "rgba(47, 36, 29, 0.78)" }}>
            {serviceAreas.map((area) => (
              <li key={area} className="rounded-xl px-3 py-2" style={{ background: "#fbf4e8" }}>{area}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(47, 36, 29, 0.64)" }}>Local Reviews</p>
        <h2 className="mt-2 text-3xl" style={{ color: "#2b211b" }}>Neighbors Trust ExtraSure</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border p-5" style={{ borderColor: "rgba(47, 36, 29, 0.17)", background: "#fff8ee" }}>
              <p className="text-sm leading-6" style={{ color: "rgba(47, 36, 29, 0.78)" }}>&quot;{testimonial.quote}&quot;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(47, 36, 29, 0.58)" }}>
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
