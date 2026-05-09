import { testimonials } from "@/lib/site";

export default function ReviewsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Testimonials</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">What Syracuse Area Customers Say</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">This launch content is ready for direct replacement with your approved Google and verified client reviews from admin controls.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <article key={testimonial.name} className="paper-panel rounded-2xl border border-[#d3c7ad] p-5">
            <p className="text-sm leading-6 text-[#33453a]">&quot;{testimonial.quote}&quot;</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#5a6b60]">{testimonial.name} • {testimonial.area}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
