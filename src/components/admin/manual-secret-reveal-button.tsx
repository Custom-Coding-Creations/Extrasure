"use client";

import { useMemo, useState } from "react";

type RevealResponse = {
  ok?: boolean;
  value?: string;
  error?: string;
};

type ManualSecretRevealButtonProps = {
  secretId: string;
  disabled?: boolean;
};

export function ManualSecretRevealButton({ secretId, disabled = false }: ManualSecretRevealButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "revealed" | "copied" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [revealedValue, setRevealedValue] = useState<string | null>(null);

  const buttonLabel = useMemo(() => {
    if (status === "loading") {
      return "Working...";
    }

    if (status === "copied") {
      return "Copied";
    }

    return "Copy Password";
  }, [status]);

  async function fetchSecretValue() {
    const response = await fetch(`/api/admin/manual/secrets/${secretId}/reveal`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });

    const payload = (await response.json()) as RevealResponse;

    if (!response.ok || !payload.value) {
      throw new Error(payload.error ?? "Unable to access this secret.");
    }

    return payload.value;
  }

  async function revealSecret() {
    if (disabled) {
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      const value = await fetchSecretValue();
      setRevealedValue(value);
      setStatus("revealed");
      setMessage("Password revealed for 20 seconds.");
      window.setTimeout(() => {
        setRevealedValue(null);
        setStatus("idle");
        setMessage("");
      }, 20000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to access this secret.");
    }
  }

  async function copySecret() {
    if (disabled) {
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      const value = revealedValue ?? (await fetchSecretValue());
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      setMessage("Password copied to clipboard.");
      window.setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to copy this secret.");
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || status === "loading"}
          onClick={revealSecret}
          className="rounded-full border border-[#3a5a49] px-3 py-1 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reveal Password
        </button>
        <button
          type="button"
          disabled={disabled || status === "loading"}
          onClick={copySecret}
          className="rounded-full border border-[#35506b] px-3 py-1 text-xs font-semibold text-[#233d5a] transition hover:bg-[#233d5a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
      <p className="font-mono text-xs text-[#445349]">{revealedValue ?? "••••••••••••••••"}</p>
      {message ? <p className={`text-xs ${status === "error" ? "text-[#8a3d22]" : "text-[#4f695b]"}`}>{message}</p> : null}
    </div>
  );
}
