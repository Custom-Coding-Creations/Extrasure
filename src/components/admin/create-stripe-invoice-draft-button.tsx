"use client";

import { useMemo, useState } from "react";

type CreateStripeInvoiceDraftButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type InvoiceSyncResponse = {
  ok?: boolean;
  stripeInvoiceId?: string;
  status?: string | null;
  error?: string;
};

export function CreateStripeInvoiceDraftButton({
  invoiceId,
  disabled = false,
}: CreateStripeInvoiceDraftButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Creating...";
    }

    if (status === "done") {
      return "Draft Ready";
    }

    return "Create Stripe Draft";
  }, [status]);

  async function createDraft() {
    if (disabled) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "invoice_sync",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as InvoiceSyncResponse;

      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to create Stripe draft invoice.");
        return;
      }

      setStatus("done");
      setMessage(`Stripe draft ${payload.status ?? "created"}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Unable to create Stripe draft invoice.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={createDraft}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#3d6481] px-3 py-1 text-xs font-semibold text-[#2f5370] transition hover:bg-[#2f5370] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
