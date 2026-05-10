"use client";

import { useMemo, useState } from "react";

type SubscriptionAction = "pause" | "resume" | "cancel";

type SubscriptionLifecycleButtonProps = {
  customerId: string;
  action: SubscriptionAction;
  disabled?: boolean;
};

type SubscriptionResponse = {
  ok?: boolean;
  status?: string;
  error?: string;
};

function actionLabel(action: SubscriptionAction, status: "idle" | "loading" | "done" | "error") {
  if (status === "loading") {
    return "Saving...";
  }

  if (status === "done") {
    return "Updated";
  }

  if (action === "pause") {
    return "Pause";
  }

  if (action === "resume") {
    return "Resume";
  }

  return "Cancel End of Term";
}

export function SubscriptionLifecycleButton({
  customerId,
  action,
  disabled = false,
}: SubscriptionLifecycleButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => actionLabel(action, status), [action, status]);

  async function runAction() {
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
          action: "subscription",
          customerId,
          subscriptionAction: action,
        }),
      });

      const payload = (await response.json()) as SubscriptionResponse;

      if (!response.ok || !payload.status) {
        setStatus("error");
        setMessage(payload.error ?? "Unable to update subscription.");
        return;
      }

      setStatus("done");
      setMessage(`Subscription ${payload.status}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Unable to update subscription.");
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={runAction}
        disabled={disabled || status === "loading"}
        className="rounded-full border border-[#2f4a78] px-3 py-1 text-xs font-semibold text-[#2f4a78] transition hover:bg-[#2f4a78] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? <span className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</span> : null}
    </div>
  );
}
