import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaStrip } from "@/components/cta-strip";
import { company, services } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/services" className="text-sm font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
        Back to all services
      </Link>
      <h1 className="mt-3 text-4xl text-[#15281f]">{service.name}</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">{service.summary}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
          <h2 className="text-2xl text-[#203328]">Signs You Need This Service</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#445349]">
            {service.signs.map((sign) => (
              <li key={sign}>{sign}</li>
            ))}
          </ul>
        </section>
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
          <h2 className="text-2xl text-[#203328]">Our Treatment Process</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-[#445349]">
            {service.process.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-emerald-900/15 bg-[#f0e7d2] p-5">
        <h2 className="text-2xl text-[#203328]">Pricing and Safety Notes</h2>
        <p className="mt-2 text-sm text-[#33453a]">Starting at {service.startingAt}. Final pricing depends on property layout, infestation level, and treatment frequency. {company.name} uses EPA-guided products and explains all pet/child safety steps before treatment.</p>
      </section>
      <CtaStrip />
    </div>
  );
}
