import { CtaStrip } from "@/components/cta-strip";

const industries = ["Restaurants and food service", "Property management", "Offices and retail", "Warehouses and facilities", "Healthcare and professional clinics"];

export default function CommercialPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Commercial Services</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Commercial Pest Management with Reliable Documentation</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">Protect operations, reputation, and inspections with routine service plans tailored to your facility risk profile and compliance needs.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
          <h2 className="text-2xl text-[#203328]">Built for Your Industry</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#445349]">
            {industries.map((industry) => (
              <li key={industry}>{industry}</li>
            ))}
          </ul>
        </section>
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
          <h2 className="text-2xl text-[#203328]">What You Can Expect</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#445349]">
            <li>Site-specific protocol planning</li>
            <li>Scheduled preventative visits</li>
            <li>Fast response for urgent pest pressure</li>
            <li>Service logs for internal records and audits</li>
          </ul>
        </section>
      </div>
      <CtaStrip />
    </div>
  );
}
