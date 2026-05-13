import { LeadForm } from "@/components/lead-form";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { getSignedInCustomerFormPrefill } from "@/lib/customer-form-prefill";
import { company } from "@/lib/site";
import Link from "next/link";

export default async function ContactPage() {
  const prefill = await getSignedInCustomerFormPrefill();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Contact</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Request Your Free Inspection</h1>
      <p className="mt-4 max-w-3xl text-[#33453a]">Phone-first support with form, SMS, email, and live chat-ready structure for launch. Emergency requests receive extended evening response when available.</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
          <h2 className="text-2xl text-[#203328]">Quick Contact</h2>
          <ul className="mt-4 space-y-2 text-sm text-[#33453a]">
            <li>
              <strong>Call:</strong>{" "}
              <TrackedContactLink href={company.phoneHref} eventName="call_click" eventPayload={{ source: "contact_page" }}>
                {company.phoneDisplay}
              </TrackedContactLink>
            </li>
            <li>
              <strong>Text:</strong>{" "}
              <TrackedContactLink href={company.smsHref} eventName="sms_click" eventPayload={{ source: "contact_page" }}>
                {company.phoneDisplay}
              </TrackedContactLink>
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <TrackedContactLink
                href={`mailto:${company.email}`}
                eventName="email_click"
                eventPayload={{ source: "contact_page" }}
              >
                {company.email}
              </TrackedContactLink>
            </li>
          </ul>
          <h3 className="mt-5 text-xl text-[#203328]">Business Hours</h3>
          <ul className="mt-3 space-y-1 text-sm text-[#445349]">
            {company.hours.map((hour) => (
              <li key={hour}>{hour}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[#445349]">{company.emergencyPolicy}</p>
          <p className="mt-4 text-sm text-[#445349]">
            Already a customer?{" "}
            <Link href="/pay" className="font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
              Pay your invoice online
            </Link>
            .
          </p>
        </section>
        <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
          <h2 className="text-2xl text-[#203328]">Inspection Form</h2>
          <LeadForm
            source="contact_page_form"
            defaults={prefill ? {
              fullName: prefill.fullName,
              phone: prefill.phone,
              email: prefill.email,
              addressOrZip: prefill.addressOrZip,
            } : undefined}
          />
        </section>
      </div>
    </div>
  );
}
