"use client";

import { useActionState } from "react";
import { loginOwner, type LoginState } from "@/app/owner-login/actions";

const initialState: LoginState = {
  message: "",
};

export default function OwnerLoginPage() {
  const [state, action, pending] = useActionState(loginOwner, initialState);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[#d3c7ad] bg-[#fff9eb] p-7 shadow-lg shadow-black/5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#5d7267]">ExtraSure Admin</p>
        <h1 className="mt-2 text-3xl text-[#15281f]">Owner Login</h1>
        <p className="mt-3 text-sm text-[#445349]">
          Sign in to access operations, dispatch, invoicing, and payment management.
        </p>

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
