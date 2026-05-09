"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type LeadFormProps = {
  source: string;
  includeEmail?: boolean;
  includeService?: boolean;
  compact?: boolean;
};

export function LeadForm({
  source,
  includeEmail = true,
  includeService = true,
  compact = false,
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      source,
      fullName: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      addressOrZip: String(formData.get("addressOrZip") ?? "").trim(),
      serviceNeeded: String(formData.get("serviceNeeded") ?? "").trim(),
      details: String(formData.get("details") ?? "").trim(),
    };

    setStatus("submitting");
    setMessage("");
    trackEvent("lead_form_submit_attempt", { source });

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Lead submission failed");
      }

      setStatus("success");
      setMessage("Thanks, we received your request and will reach out shortly.");
      trackEvent("lead_form_submit_success", { source });
      form.reset();
    } catch {
      setStatus("error");
      setMessage("We could not submit your request. Please call us directly for faster help.");
      trackEvent("lead_form_submit_error", { source });
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={onSubmit}>
      <input className="field" name="fullName" placeholder="Full name" aria-label="Full name" required />
      <input className="field" name="phone" placeholder="Phone number" aria-label="Phone number" required />
      {includeEmail ? <input className="field" name="email" placeholder="Email" aria-label="Email" type="email" /> : null}
      <input
        className="field"
        name="addressOrZip"
        placeholder={compact ? "Service address or ZIP" : "Address / ZIP"}
        aria-label="Address or ZIP"
        required
      />
      {includeService ? (
        <select className="field" name="serviceNeeded" aria-label="Service needed" defaultValue="">
          <option value="" disabled>
            Select service needed
          </option>
          <option>General Pest Prevention</option>
          <option>Ant Control</option>
          <option>Rodent Control</option>
          <option>Bed Bug Treatment</option>
          <option>Termite Treatment</option>
          <option>Mosquito/Tick Treatments</option>
          <option>Wildlife Exclusion</option>
          <option>Commercial Services</option>
        </select>
      ) : null}
      <textarea
        className="field min-h-24"
        name="details"
        placeholder={compact ? "Describe the pest issue" : "Tell us what you are seeing"}
        aria-label="Pest issue details"
        required
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f251b] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "submitting" ? "Submitting..." : "Submit Request"}
      </button>
      {message ? (
        <p className={`text-sm ${status === "success" ? "text-emerald-800" : "text-red-700"}`}>{message}</p>
      ) : null}
    </form>
  );
}
