"use client";

import { useMemo, useState } from "react";

type StripeInvoicePdfButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type InvoicePdfResponse = {
  ok?: boolean;
  pdfUrl?: string | null;
  error?: string;
};

export function StripeInvoicePdfButton({ invoiceId, disabled = false }: StripeInvoicePdfButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Getting PDF...";
    }

    if (status === "done") {
      return "PDF Opened";
    }

    return "Invoice PDF";
  }, [status]);

  async function openPdf() {
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
          action: "invoice_pdf",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as InvoicePdfResponse;

      if (!response.ok || !payload.pdfUrl) {
        setStatus("error");
        setMessage(payload.error ?? "Stripe invoice PDF is unavailable.");
        return;
      }

      window.open(payload.pdfUrl, "_blank", "noopener,noreferrer");
      setStatus("done");
      setMessage("Opened Stripe invoice PDF in a new tab.");
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 1800);
    } catch {
      setStatus("error");
      setMessage("Stripe invoice PDF is unavailable.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={openPdf}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#6e6c4f] px-3 py-1 text-xs font-semibold text-[#545237] transition hover:bg-[#545237] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
