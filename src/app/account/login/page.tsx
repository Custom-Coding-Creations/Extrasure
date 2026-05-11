"use client";

import { useActionState } from "react";
import { loginCustomer, signupCustomer, type CustomerAuthState } from "@/app/account/login/actions";

const initialState: CustomerAuthState = {
  message: "",
};

export default function CustomerLoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(loginCustomer, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signupCustomer, initialState);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
      <section className="rounded-3xl border border-[#d3c7ad] bg-[#fff9eb] p-7 shadow-lg shadow-black/5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#5d7267]">Customer Account</p>
        <h1 className="mt-2 text-3xl text-[#15281f]">Sign In</h1>
        <p className="mt-2 text-sm text-[#445349]">
          Access your profile, subscription details, payment methods, invoices, service history, and account messages.
        </p>

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
          <button
            type="submit"
            disabled={loginPending}
            className="w-full rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginPending ? "Signing in..." : "Sign In"}
          </button>
          {loginState.message ? <p className="text-sm text-red-700">{loginState.message}</p> : null}
        </form>
      </section>

      <section className="rounded-3xl border border-[#d3c7ad] bg-[#fff9eb] p-7 shadow-lg shadow-black/5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#5d7267]">First Time Here?</p>
        <h2 className="mt-2 text-3xl text-[#15281f]">Create Account</h2>
        <p className="mt-2 text-sm text-[#445349]">
          Use the same email already on your customer record to claim your account.
        </p>

        <form action={signupAction} className="mt-6 space-y-3">
          <input className="field" type="email" name="email" placeholder="Billing email" autoComplete="email" required />
          <input
            className="field"
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
            className="w-full rounded-xl border border-[#163526] px-4 py-3 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {signupPending ? "Creating account..." : "Create Account"}
          </button>
          {signupState.message ? <p className="text-sm text-red-700">{signupState.message}</p> : null}
        </form>
      </section>
    </div>
  );
}
