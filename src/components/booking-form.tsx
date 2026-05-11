"use client";

import { useState } from "react";
import { AvailabilityPicker } from "@/components/availability-picker";
import { startBookingCheckoutAction } from "@/app/book/actions";

interface BookingFormProps {
  activeItems: Array<{
    id: string;
    name: string;
    description: string;
    kind: "subscription" | "one_time";
    billingCycle?: string;
    amount: number;
  }>;
}

export function BookingForm({ activeItems }: BookingFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(activeItems[0]?.id || "");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-[#deceb0] bg-[#fffdf6] p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-[#1d2f25]">1. Select your service</h2>
        <div className="mt-4 space-y-3">
          {activeItems.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-[#e0d2b6] bg-white px-4 py-3 text-sm text-[#33453a]"
            >
              <input
                type="radio"
                name="serviceCatalogItemId"
                value={item.id}
                checked={selectedServiceId === item.id}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block font-semibold text-[#1e3026]">{item.name}</span>
                <span className="mt-1 block text-xs text-[#5d7267]">{item.description}</span>
                <span className="mt-2 block text-xs uppercase tracking-[0.1em] text-[#5a6f63]">
                  {item.kind === "subscription" ? `${item.billingCycle} plan` : "one-time service"} • {item.amount}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#deceb0] bg-[#fffdf6] p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-[#1d2f25]">2. Schedule and checkout</h2>
        <form id="book-checkout-form" action={startBookingCheckoutAction} className="mt-4 grid gap-3">
          <input type="hidden" name="serviceCatalogItemId" value={selectedServiceId} />

          <input
            name="contactName"
            required
            placeholder="Full name"
            className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="contactEmail"
              type="email"
              required
              placeholder="Email"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
            <input
              name="contactPhone"
              required
              placeholder="Phone"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
          </div>

          {/* New availability picker replaces the old date/time window selects */}
          <AvailabilityPicker
            serviceId={selectedServiceId}
            onSlotSelected={setSelectedSlot}
          />

          <input
            name="addressLine1"
            required
            placeholder="Service address"
            className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="addressLine2"
              placeholder="Apt / suite (optional)"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
            <input
              name="city"
              required
              placeholder="City"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="postalCode"
              required
              placeholder="Postal code"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
            <input
              name="stateProvince"
              required
              placeholder="State / Province"
              className="rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-[#e0d2b6] bg-white px-4 py-3 text-sm text-[#33453a]">
            <input
              name="marketingConsent"
              type="checkbox"
              defaultChecked
              className="h-4 w-4"
            />
            <span>
              I agree to receive service updates and special offers from Extrasure via email and SMS
            </span>
          </label>
          <button
            type="submit"
            disabled={!selectedSlot}
            className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!selectedSlot ? "Select a time to continue" : "Continue to secure checkout"}
          </button>
        </form>
      </section>
    </div>
  );
}
