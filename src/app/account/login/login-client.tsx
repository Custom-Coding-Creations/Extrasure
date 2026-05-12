"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loginCustomer,
  requestPasswordResetAction,
  signupCustomer,
  type CustomerAuthState,
} from "@/app/account/login/actions";

const initialState: CustomerAuthState = {
  message: "",
};

const oauthErrorMessages: Record<string, string> = {
  invalid_state: "Your sign-in session expired. Please try again.",
  provider_denied: "Sign-in was cancelled at the provider.",
  provider_mismatch: "Sign-in provider mismatch. Please try again.",
  provider_config: "OAuth is not configured correctly yet.",
  missing_code: "Provider did not return an authorization code.",
  callback_failed: "Social sign-in failed. Please try again.",
  account_disabled: "This account is disabled. Contact support.",
  not_authorized: "This email is not authorized for admin access.",
};

export function LoginClient() {
  const searchParams = useSearchParams();
  const [loginState, loginAction, loginPending] = useActionState(loginCustomer, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signupCustomer, initialState);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordResetAction, initialState);
  const resetDone = searchParams.get("reset") === "done";
  const oauthErrorCode = searchParams.get("oauth_error") ?? "";
  const oauthError = oauthErrorMessages[oauthErrorCode];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(212,133,52,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(22,53,38,0.14),_transparent_28%),linear-gradient(180deg,_#f8f1e5_0%,_#f2ead7_100%)]" />
      <div className="absolute left-0 top-24 -z-10 h-72 w-72 rounded-full bg-[#d48534]/10 blur-3xl" />
      <div className="absolute right-0 top-48 -z-10 h-96 w-96 rounded-full bg-[#163526]/10 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <section className="flex flex-col justify-between rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-8 shadow-[0_20px_50px_rgba(20,40,30,0.08)] lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#6c7568]">Customer Portal</p>
            <h1 className="mt-4 max-w-xl text-5xl leading-[0.95] text-[#13251d] sm:text-6xl">
              One account for every service, invoice, and message.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#47564c]">
              Sign in, create a new account in minutes, manage your billing, and reset your password without waiting on office hours.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Fast access", value: "Sign in, pay, and review invoices in one place." },
              { label: "Self-serve", value: "Create a new account with your own contact details." },
              { label: "Secure", value: "Password reset and account controls built in." },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-[#ddcfb2] bg-[#fffdf6] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#6b705e]">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-[#33453a]">{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5">
          {oauthError ? (
            <div className="rounded-2xl border border-[#e3b7b7] bg-[#fdf0f0] px-5 py-4 text-sm text-[#6b2323]">
              {oauthError}
            </div>
          ) : null}

          {resetDone ? (
            <div className="rounded-2xl border border-[#b8d8c6] bg-[#ecf9f0] px-5 py-4 text-sm text-[#1f4b33]">
              Password updated. Sign in with your new password below.
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-6 shadow-[0_20px_45px_rgba(20,40,30,0.06)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6c7568]">Sign In</p>
            <h2 className="mt-2 text-3xl text-[#15281f]">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-[#506155]">Use the email and password you created for your portal account.</p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <a
                href="/api/auth/start?flow=customer&provider=google"
                className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-center text-sm font-semibold text-[#1f3127] transition hover:bg-[#f9f2e4]"
              >
                Continue with Google
              </a>
              <a
                href="/api/auth/start?flow=customer&provider=microsoft"
                className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-center text-sm font-semibold text-[#1f3127] transition hover:bg-[#f9f2e4]"
              >
                Continue with Microsoft
              </a>
            </div>

            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#6c7568]">Or sign in with email</p>

            <form action={loginAction} className="mt-6 space-y-3">
              <input className="field" type="email" name="email" placeholder="Email" autoComplete="email" required />
              <input
                className="field"
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={loginPending}
                  className="rounded-xl bg-[#163526] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loginPending ? "Signing in..." : "Sign In"}
                </button>
                <a href="/account/forgot-password" className="text-sm font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">
                  Forgot password?
                </a>
              </div>
              {loginState.message ? <p className="text-sm text-red-700">{loginState.message}</p> : null}
            </form>
          </div>

          <div className="rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-6 shadow-[0_20px_45px_rgba(20,40,30,0.06)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6c7568]">Create Account</p>
            <h2 className="mt-2 text-3xl text-[#15281f]">Start your portal access</h2>
            <p className="mt-2 text-sm leading-6 text-[#506155]">
              No existing customer record required. Create your account with your own contact details.
            </p>

            <form action={signupAction} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input className="field sm:col-span-2" name="name" placeholder="Full name" autoComplete="name" required />
              <input className="field" type="email" name="email" placeholder="Email" autoComplete="email" required />
              <input className="field" name="phone" placeholder="Phone" autoComplete="tel" required />
              <input className="field sm:col-span-2" name="city" placeholder="City" autoComplete="address-level2" required />
              <input
                className="field sm:col-span-2"
                type="password"
                name="password"
                placeholder="Create password (8+ characters)"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="submit"
                disabled={signupPending}
                className="sm:col-span-2 rounded-xl border border-[#163526] px-5 py-3 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {signupPending ? "Creating account..." : "Create Account"}
              </button>
              {signupState.message ? <p className="sm:col-span-2 text-sm text-red-700">{signupState.message}</p> : null}
            </form>
          </div>

          <div className="rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-6 shadow-[0_20px_45px_rgba(20,40,30,0.06)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6c7568]">Forgot Password</p>
            <h2 className="mt-2 text-3xl text-[#15281f]">Reset access</h2>
            <p className="mt-2 text-sm leading-6 text-[#506155]">
              Enter your email and we’ll prepare a reset link so you can choose a new password right away.
            </p>

            <form action={resetAction} className="mt-6 flex gap-3">
              <input className="field flex-1" type="email" name="email" placeholder="Email" autoComplete="email" required />
              <button
                type="submit"
                disabled={resetPending}
                className="rounded-xl bg-[#163526] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {resetPending ? "Preparing..." : "Reset"}
              </button>
            </form>
            {resetState.message ? <p className="mt-3 text-sm text-red-700">{resetState.message}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
