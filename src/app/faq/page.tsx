import { CtaStrip } from "@/components/cta-strip";
import { faqs } from "@/lib/site";

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">FAQ</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Common Questions, Straight Answers</h1>
      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
            <summary className="cursor-pointer text-lg text-[#203328]">{faq.question}</summary>
            <p className="mt-3 text-sm leading-6 text-[#445349]">{faq.answer}</p>
          </details>
        ))}
      </div>
      <CtaStrip />
    </div>
  );
}
