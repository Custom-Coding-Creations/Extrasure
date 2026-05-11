"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction, type CustomerAuthState } from "@/app/account/login/actions";

const initialState: CustomerAuthState = {
  message: "",
};

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-[2rem] border border-[#d5c7a8] bg-[#fff8ea] p-8 shadow-[0_20px_45px_rgba(20,40,30,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6c7568]">Password Reset</p>
        <h1 className="mt-2 text-4xl text-[#15281f]">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-[#506155]">
          Enter a new password and we’ll update your account immediately.
        </p>

        <form action={action} className="mt-6 space-y-3">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[#6c7568]" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
              placeholder="Create password"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !token}
            className="w-full rounded-xl bg-[#163526] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Updating..." : "Update Password"}
          </button>
          {state.message ? <p className="text-sm text-red-700">{state.message}</p> : null}
          {!token ? <p className="text-sm text-red-700">Missing reset token.</p> : null}
        </form>
      </section>
    </div>
  );
}
