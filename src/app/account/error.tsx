"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type AccountErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AccountErrorPage({ error, reset }: AccountErrorPageProps) {
  useEffect(() => {
    trackEvent("account_error_boundary_view", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="dashboard-shell mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#60766b] dark:text-[#cabca1]">ExtraSure Home Platform</p>
        <h1 className="mt-3 text-3xl text-[#173126] dark:text-[#f1e7d2] sm:text-4xl">We couldn’t load this part of your protection dashboard.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#40584a] dark:text-[#d5c8ad] sm:text-base">
          Your account details are still secure. Please try again, return to Home Protection, or contact the ExtraSure team if you need immediate assistance.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={reset}
            className="elevated-action rounded-full bg-[#163526] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f4a36]"
          >
            Try Again
          </button>
          <Link
            href="/account"
            className="elevated-action rounded-full border border-[#d0c4aa] bg-[#fffcf5] px-5 py-3 text-center text-sm font-semibold text-[#163526] hover:bg-[#f8efdc] dark:border-[#4e6851] dark:bg-[#1f3328] dark:text-[#efe6d0]"
          >
            Return Home
          </Link>
          <Link
            href="/account/notes"
            className="elevated-action rounded-full border border-[#d0c4aa] bg-[#fffcf5] px-5 py-3 text-center text-sm font-semibold text-[#163526] hover:bg-[#f8efdc] dark:border-[#4e6851] dark:bg-[#1f3328] dark:text-[#efe6d0]"
          >
            Open Support
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 text-sm text-[#40584a] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
          Suggested next step: if this happened while changing billing or profile details, wait a moment and retry once before contacting support.
        </div>
      </section>
    </div>
  );
}