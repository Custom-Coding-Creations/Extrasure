"use client";

import { useMemo, useState } from "react";

type GeneratePaymentLinkButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type PaymentLinkResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
};

export function GeneratePaymentLinkButton({ invoiceId, disabled = false }: GeneratePaymentLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Generating...";
    }

    if (status === "copied") {
      return "Link Copied";
    }

    return "Copy Payment Link";
  }, [status]);

  async function generateAndCopy() {
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
          action: "link",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as PaymentLinkResponse;

      if (!response.ok || !payload.url) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to generate payment link.");
        return;
      }

      await navigator.clipboard.writeText(payload.url);
      setStatus("copied");
      setMessage("Payment link copied to clipboard.");
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    } catch {
      setStatus("error");
      setMessage("Unable to generate payment link.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={generateAndCopy}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#3a5a49] px-3 py-1 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
