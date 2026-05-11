"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type CustomerAuthState } from "@/app/account/login/actions";

const initialState: CustomerAuthState = {
  message: "",
};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-8 shadow-[0_20px_45px_rgba(20,40,30,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6c7568]">Forgot Password</p>
        <h1 className="mt-2 text-4xl text-[#15281f]">Recover your account</h1>
        <p className="mt-3 text-sm leading-6 text-[#506155]">
          Enter your email and we’ll prepare a reset link so you can set a new password.
        </p>

        <form action={action} className="mt-6 space-y-3">
          <input className="field" type="email" name="email" placeholder="Email" autoComplete="email" required />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#163526] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Preparing..." : "Send Reset Link"}
          </button>
          {state.message ? <p className="text-sm text-red-700">{state.message}</p> : null}
        </form>

        <p className="mt-6 text-sm text-[#506155]">
          Remembered it? <Link href="/account/login" className="font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">Back to sign in</Link>.
        </p>
      </section>
    </div>
  );
}
