import Link from "next/link";
import { CtaStrip } from "@/components/cta-strip";
import { services } from "@/lib/site";

export default function ServicesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Services</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Residential and Commercial Pest Solutions</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">Every service begins with a practical inspection and clear recommendations. You get transparent pricing, safe treatment options, and a local team that stays responsive.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <article key={service.slug} className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
            <h2 className="text-2xl text-[#203328]">{service.name}</h2>
            <p className="mt-2 text-sm text-[#445349]">{service.summary}</p>
            <p className="mt-3 text-sm font-semibold text-[#163526]">Starting at {service.startingAt}</p>
            <Link href={`/services/${service.slug}`} className="mt-4 inline-block text-sm font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
              See details
            </Link>
          </article>
        ))}
      </div>
      <CtaStrip />
    </div>
  );
}
