"use client";

import { useEffect, useState } from "react";
import { AchDiscountBadge } from "@/components/payment-methods/AchDiscountBadge";
import { AutopayToggle } from "@/components/payment-methods/AutopayToggle";
import { PaymentMethodList } from "@/components/payment-methods/PaymentMethodList";
import { PaymentMethodSelector } from "@/components/payment-methods/PaymentMethodSelector";
import type { PaymentMethodType } from "@/types/payment-preferences";

type PaymentMethodItem = {
  id: string;
  type: "card" | "ach";
  brand: string;
  last4: string;
  isDefault: boolean;
};

type PaymentPreferenceState = {
  preferredPaymentMethod: PaymentMethodType;
  autopayEnabled: boolean;
  autopayMethodType: PaymentMethodType;
  achDiscountEligible: boolean;
};

type PaymentMethodsResponse = {
  ok: boolean;
  methods: PaymentMethodItem[];
  preference: PaymentPreferenceState;
};

export function PaymentMethodManager() {
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [preference, setPreference] = useState<PaymentPreferenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadState() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payment-methods", { cache: "no-store" });
      const payload = (await response.json()) as PaymentMethodsResponse;

      if (!response.ok || !payload.ok) {
        throw new Error("Unable to load payment methods");
      }

      setMethods(payload.methods ?? []);
      setPreference(payload.preference);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unable to load payment settings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadState();
  }, []);

  async function setDefault(methodId: string) {
    setBusyId(methodId);

    try {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-default" }),
      });

      if (!response.ok) {
        throw new Error("Could not set default payment method");
      }

      await loadState();
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Could not set default payment method";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeMethod(methodId: string) {
    setBusyId(methodId);

    try {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete payment method");
      }

      await loadState();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Could not delete payment method";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function updatePreferences(next: Partial<PaymentPreferenceState>) {
    if (!preference) {
      return;
    }

    const current = preference;
    const merged: PaymentPreferenceState = {
      ...preference,
      ...next,
    };

    setPreference(merged);
    setSavingPrefs(true);

    try {
      const response = await fetch("/api/payment-methods/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredMethod: merged.preferredPaymentMethod,
          autopayEnabled: merged.autopayEnabled,
          autopayMethodType: merged.autopayEnabled ? merged.preferredPaymentMethod : "none",
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; preference?: PaymentPreferenceState };

      if (!response.ok || !payload.ok || !payload.preference) {
        throw new Error("Could not update payment preferences");
      }

      setPreference(payload.preference);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Could not update payment preferences";
      setError(message);
      setPreference(current);
    } finally {
      setSavingPrefs(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#50665a]">Loading payment methods...</p>;
  }

  if (!preference) {
    return <p className="text-sm text-[#8a3d22]">Unable to load payment preferences right now.</p>;
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-[#e0c6ae] bg-[#fff1e6] px-4 py-3 text-sm text-[#8a3d22]">
          {error}
        </div>
      ) : null}

      {preference.achDiscountEligible ? (
        <AchDiscountBadge savingsAmount={3} discountedAmount={97} />
      ) : null}

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#567063]">Preferred Method</h3>
        <p className="mt-1 text-sm text-[#40584a]">This preference controls method ordering in future checkout sessions.</p>
        <div className="mt-3">
          <PaymentMethodSelector
            value={preference.preferredPaymentMethod}
            onChange={(preferredPaymentMethod) => void updatePreferences({ preferredPaymentMethod })}
            disabled={savingPrefs}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#567063]">Autopay</h3>
            <p className="mt-1 text-sm text-[#40584a]">Enable recurring automatic collection for linked invoices.</p>
          </div>
          <AutopayToggle
            enabled={preference.autopayEnabled}
            onChange={(autopayEnabled) => void updatePreferences({ autopayEnabled })}
            disabled={savingPrefs}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#567063]">Saved Payment Methods</h3>
        <p className="mt-1 text-sm text-[#40584a]">Securely stored with Stripe and available for future billing actions.</p>
        <div className="mt-3">
          <PaymentMethodList methods={methods} onSetDefault={(id) => void setDefault(id)} onDelete={(id) => void removeMethod(id)} busyId={busyId} />
        </div>
      </section>
    </div>
  );
}
