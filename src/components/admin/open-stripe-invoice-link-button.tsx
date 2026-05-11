"use client";

import { useMemo, useState } from "react";

type OpenStripeInvoiceLinkButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type InvoiceLinksResponse = {
  ok?: boolean;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  error?: string;
};

export function OpenStripeInvoiceLinkButton({
  invoiceId,
  disabled = false,
}: OpenStripeInvoiceLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Opening...";
    }

    if (status === "done") {
      return "Opened";
    }

    return "Hosted Invoice";
  }, [status]);

  async function openHostedInvoice() {
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
          action: "invoice_links",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as InvoiceLinksResponse;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Hosted invoice link is unavailable.");
        return;
      }

      const target = payload.hostedInvoiceUrl ?? payload.pdfUrl;

      if (!target) {
        setStatus("error");
        setMessage("Hosted invoice link is unavailable.");
        return;
      }

      window.open(target, "_blank", "noopener,noreferrer");
      setStatus("done");
      setMessage("Opened Stripe invoice link in a new tab.");
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 1800);
    } catch {
      setStatus("error");
      setMessage("Hosted invoice link is unavailable.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={openHostedInvoice}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#4f6f49] px-3 py-1 text-xs font-semibold text-[#3e5a37] transition hover:bg-[#3e5a37] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
