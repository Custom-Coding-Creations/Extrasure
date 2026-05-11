"use client";

import { useMemo, useState } from "react";

type FinalizeStripeInvoiceButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type InvoiceFinalizeResponse = {
  ok?: boolean;
  stripeInvoiceId?: string;
  status?: string | null;
  error?: string;
};

export function FinalizeStripeInvoiceButton({ invoiceId, disabled = false }: FinalizeStripeInvoiceButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Finalizing...";
    }

    if (status === "done") {
      return "Finalized";
    }

    return "Finalize Stripe Invoice";
  }, [status]);

  async function finalizeInvoice() {
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
          action: "invoice_finalize",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as InvoiceFinalizeResponse;

      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to finalize Stripe invoice.");
        return;
      }

      setStatus("done");
      setMessage(`Stripe invoice ${payload.status ?? "updated"}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Unable to finalize Stripe invoice.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={finalizeInvoice}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#566986] px-3 py-1 text-xs font-semibold text-[#37517a] transition hover:bg-[#37517a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
