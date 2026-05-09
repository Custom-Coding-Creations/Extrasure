import { company } from "@/lib/site";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Contact</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Request Your Free Inspection</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">Phone-first support with form, SMS, email, and live chat-ready structure for launch. Emergency requests receive extended evening response when available.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
          <h2 className="text-2xl text-[#203328]">Quick Contact</h2>
          <ul className="mt-4 space-y-2 text-sm text-[#33453a]">
            <li><strong>Call:</strong> <a href={company.phoneHref}>{company.phoneDisplay}</a></li>
            <li><strong>Text:</strong> <a href={company.smsHref}>{company.phoneDisplay}</a></li>
            <li><strong>Email:</strong> <a href={`mailto:${company.email}`}>{company.email}</a></li>
          </ul>
          <h3 className="mt-5 text-xl text-[#203328]">Business Hours</h3>
          <ul className="mt-3 space-y-1 text-sm text-[#445349]">
            {company.hours.map((hour) => (
              <li key={hour}>{hour}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[#445349]">{company.emergencyPolicy}</p>
        </section>
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
          <h2 className="text-2xl text-[#203328]">Inspection Form</h2>
          <form className="mt-4 space-y-3">
            <input className="field" placeholder="Full name" aria-label="Full name" />
            <input className="field" placeholder="Phone number" aria-label="Phone number" />
            <input className="field" placeholder="Email" aria-label="Email" />
            <input className="field" placeholder="Address / ZIP" aria-label="Address or ZIP" />
            <select className="field" aria-label="Service needed" defaultValue="">
              <option value="" disabled>Select service needed</option>
              <option>General Pest Prevention</option>
              <option>Ant Control</option>
              <option>Rodent Control</option>
              <option>Bed Bug Treatment</option>
              <option>Termite Treatment</option>
              <option>Mosquito/Tick Treatments</option>
              <option>Wildlife Exclusion</option>
              <option>Commercial Services</option>
            </select>
            <textarea className="field min-h-24" placeholder="Tell us what you are seeing" aria-label="Pest issue details" />
            <button type="button" className="w-full rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f251b]">
              Submit Request
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
