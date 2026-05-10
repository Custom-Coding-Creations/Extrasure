"use client";

import { useMemo, useState } from "react";

type ReplayWebhookButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

type ReplayResponse = {
  ok?: boolean;
  eventId?: string;
  eventType?: string;
  error?: string;
};

export function ReplayWebhookButton({ invoiceId, disabled = false }: ReplayWebhookButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (status === "loading") {
      return "Replaying...";
    }

    if (status === "done") {
      return "Replayed";
    }

    return "Replay Webhook";
  }, [status]);

  async function replay() {
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
          action: "replay",
          invoiceId,
        }),
      });

      const payload = (await response.json()) as ReplayResponse;

      if (!response.ok || !payload.eventId) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to replay webhook.");
        return;
      }

      setStatus("done");
      setMessage(`Replayed ${payload.eventType ?? "event"}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Unable to replay webhook.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={replay}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#6b4d2d] px-3 py-1 text-xs font-semibold text-[#6b4d2d] transition hover:bg-[#6b4d2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
