"use client";

import { useMemo, useState } from "react";

type ReconcileInvoiceButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type ReconcileResponse = {
  ok?: boolean;
  invoiceStatus?: string;
  paymentStatus?: string;
  error?: string;
};

export function ReconcileInvoiceButton({ invoiceId, disabled = false }: ReconcileInvoiceButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Reconciling...";
    }

    if (status === "done") {
      return "Reconciled";
    }

    return "Reconcile";
  }, [status]);

  async function reconcile() {
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
          action: "reconcile",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as ReconcileResponse;

      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to reconcile this invoice.");
        return;
      }

      setStatus("done");
      setMessage(`Invoice ${payload.invoiceStatus ?? "updated"}, payment ${payload.paymentStatus ?? "updated"}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Unable to reconcile this invoice.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={reconcile}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#6c6f7c] px-3 py-1 text-xs font-semibold text-[#30435b] transition hover:bg-[#30435b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
