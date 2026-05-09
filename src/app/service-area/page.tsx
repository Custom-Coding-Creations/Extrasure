import { CtaStrip } from "@/components/cta-strip";
import { serviceAreas } from "@/lib/site";

export default function ServiceAreaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Service Area</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Serving Syracuse and Central New York Communities</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">If you are near Syracuse and do not see your town below, contact us. We regularly support surrounding neighborhoods for both home and business pest issues.</p>
      <ul className="mt-8 grid gap-3 text-sm text-[#33453a] sm:grid-cols-2 md:grid-cols-3">
        {serviceAreas.map((area) => (
          <li key={area} className="rounded-xl border border-[#d3c7ad] bg-[#fff9eb] px-3 py-2">{area}</li>
        ))}
      </ul>
      <CtaStrip />
    </div>
  );
}
