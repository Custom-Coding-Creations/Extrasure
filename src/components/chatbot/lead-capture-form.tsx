"use client";

import { FormEvent } from "react";
import { useChatbot } from "./chatbot-provider";

export function LeadCaptureForm() {
  const { leadStatus, leadMessage, submitLead } = useChatbot();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await submitLead({
      name: String(formData.get("fullName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      addressOrZip: String(formData.get("addressOrZip") ?? "").trim(),
      pestType: String(formData.get("pestType") ?? "").trim(),
      propertyType: String(formData.get("propertyType") ?? "").trim(),
      urgency: String(formData.get("urgency") ?? "").trim(),
      details: String(formData.get("details") ?? "").trim(),
    });

    if (leadStatus === "success") {
      (event.currentTarget as HTMLFormElement).reset();
    }
  }

  return (
    <form className="mt-3 space-y-2 rounded-xl border border-[#d9c8a8] bg-[#fff4de] p-3" onSubmit={handleSubmit}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3e5348]">Quick Follow-Up Request</p>
      <input className="field" name="fullName" placeholder="Full name" required />
      <input className="field" name="phone" placeholder="Phone number" required />
      <input className="field" name="email" placeholder="Email" type="email" />
      <input className="field" name="addressOrZip" placeholder="Address or ZIP" required />
      <input className="field" name="pestType" placeholder="Pest type" />
      <input className="field" name="propertyType" placeholder="Property type" />
      <select className="field" name="urgency" defaultValue="">
        <option value="" disabled>
          Urgency
        </option>
        <option>Emergency / same-day</option>
        <option>Within 48 hours</option>
        <option>This week</option>
      </select>
      <textarea className="field min-h-20" name="details" placeholder="Anything else we should know?" required />
      <button
        type="submit"
        disabled={leadStatus === "submitting"}
        className="w-full rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {leadStatus === "submitting" ? "Submitting..." : "Request Follow-Up"}
      </button>
      {leadMessage && (
        <p className={`text-xs ${leadStatus === "success" ? "text-emerald-800" : "text-red-700"}`}>{leadMessage}</p>
      )}
    </form>
  );
}
