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
      <section className="relative overflow-hidden border-b" style={{ borderColor: "rgba(132, 190, 246, 0.2)", background: "linear-gradient(145deg, #0a1524 0%, #11213b 55%, #0b1628 100%)", color: "#e9f1ff" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(122,196,255,0.24),_transparent_52%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--brand-sand)" }}>Syracuse Local Experts</p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl" style={{ color: "#f4f8ff" }}>
              Pest Problems Solved Fast, with Service You Can Trust
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7" style={{ color: "rgba(233, 241, 255, 0.84)" }}>
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
              <Link href="/contact" className="rounded-full border px-5 py-3 text-sm font-semibold transition hover:bg-white hover:text-[#0f1a2b]" style={{ borderColor: "rgba(217, 232, 255, 0.48)", color: "#d9e8ff" }}>
                {company.ctaSecondary}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs" style={{ color: "rgba(233, 241, 255, 0.84)" }}>
              {trustBadges.map((badge) => (
                <li key={badge} className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(217, 232, 255, 0.36)" }}>
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="paper-panel rounded-3xl border p-6 shadow-xl shadow-black/35" style={{ borderColor: "rgba(132, 190, 246, 0.26)", color: "var(--foreground)" }}>
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(217, 232, 255, 0.66)" }}>Free Inspection Request</p>
            <h2 className="mt-2 text-2xl" style={{ color: "#f0f6ff" }}>Tell Us What You Are Seeing</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(217, 232, 255, 0.78)" }}>We respond quickly and route every new request to email, SMS, and dispatch tracking.</p>
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
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(176, 205, 238, 0.76)" }}>Core Services</p>
            <h2 className="mt-2 text-3xl" style={{ color: "#edf3ff" }}>Built for Real-World Pest Pressure</h2>
          </div>
          <Link href="/services" className="text-sm font-semibold underline underline-offset-4" style={{ color: "#b7deff", textDecorationColor: "#3bc2d5" }}>
            View all services
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.slice(0, 8).map((service) => (
            <article key={service.slug} className="paper-panel rounded-2xl border p-5" style={{ borderColor: "rgba(132, 190, 246, 0.24)" }}>
              <h3 className="text-xl" style={{ color: "#eff5ff" }}>{service.name}</h3>
              <p className="mt-2 text-sm" style={{ color: "rgba(217, 232, 255, 0.72)" }}>{service.summary}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: "#b8e9ff" }}>Starting at {service.startingAt}</p>
              <Link href={`/services/${service.slug}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4" style={{ color: "#b8e9ff", textDecorationColor: "#3bc2d5" }}>
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y" style={{ borderColor: "rgba(132, 190, 246, 0.2)", background: "#0d1728" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(176, 205, 238, 0.76)" }}>Service Area</p>
          <h2 className="mt-2 text-3xl" style={{ color: "#edf3ff" }}>Proudly Serving Syracuse and Surrounding Communities</h2>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-3" style={{ color: "rgba(217, 232, 255, 0.82)" }}>
            {serviceAreas.map((area) => (
              <li key={area} className="rounded-xl border px-3 py-2" style={{ background: "rgba(18, 33, 54, 0.8)", borderColor: "rgba(132, 190, 246, 0.22)" }}>{area}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(176, 205, 238, 0.76)" }}>Local Reviews</p>
        <h2 className="mt-2 text-3xl" style={{ color: "#edf3ff" }}>Neighbors Trust ExtraSure</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border p-5" style={{ borderColor: "rgba(132, 190, 246, 0.24)", background: "rgba(15, 27, 45, 0.8)" }}>
              <p className="text-sm leading-6" style={{ color: "rgba(217, 232, 255, 0.84)" }}>&quot;{testimonial.quote}&quot;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(176, 205, 238, 0.72)" }}>
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
