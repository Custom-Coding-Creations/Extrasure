"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginOwner, type LoginState } from "@/app/owner-login/actions";

const initialState: LoginState = {
  message: "",
};

const oauthErrorMessages: Record<string, string> = {
  invalid_state: "Your sign-in session expired. Please try again.",
  provider_denied: "Sign-in was cancelled at the provider.",
  provider_mismatch: "Sign-in provider mismatch. Please try again.",
  provider_config: "OAuth is not configured correctly yet.",
  missing_code: "Provider did not return an authorization code.",
  callback_failed: "Social sign-in failed. Please try again.",
  not_authorized: "This email does not match an admin account.",
};

export default function OwnerLoginPage() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(loginOwner, initialState);
  const oauthErrorCode = searchParams.get("oauth_error") ?? "";
  const oauthError = oauthErrorMessages[oauthErrorCode];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#d3c7ad] bg-[#fff9eb] p-7 shadow-lg shadow-black/5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#5d7267]">ExtraSure Admin</p>
        <h1 className="mt-2 text-3xl text-[#15281f]">Owner Login</h1>
        <p className="mt-3 text-sm text-[#445349]">
          Sign in to access operations, dispatch, invoicing, and payment management.
        </p>

        {oauthError ? (
          <p className="mt-4 rounded-xl border border-[#e3b7b7] bg-[#fdf0f0] px-4 py-3 text-sm text-[#6b2323]">
            {oauthError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <a
            href="/api/auth/start?flow=admin&provider=google"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-center text-sm font-semibold text-[#1f3127] transition hover:bg-[#f9f2e4]"
          >
            Google
          </a>
          <a
            href="/api/auth/start?flow=admin&provider=microsoft"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-center text-sm font-semibold text-[#1f3127] transition hover:bg-[#f9f2e4]"
          >
            Microsoft
          </a>
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#5d7267]">Or sign in with email and password</p>

        <form action={action} className="mt-6 space-y-3">
          <input className="field" type="email" name="email" placeholder="Email" autoComplete="email" required />
          <input
            className="field"
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Signing in..." : "Sign In"}
          </button>
          {state.message ? <p className="text-sm text-red-700">{state.message}</p> : null}
        </form>
      </div>
    </div>
  );
}
