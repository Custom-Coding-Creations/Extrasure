"use client";

import { useEffect, useMemo, useState } from "react";

type RoleWalkthrough = {
  role: string;
  mission: string;
  firstFiveClicks: string[];
  dailyWorkflow: string[];
  emergencyPriority: string[];
};

type ManualRoleWalkthroughsProps = {
  walkthroughs: RoleWalkthrough[];
};

export function ManualRoleWalkthroughs({ walkthroughs }: ManualRoleWalkthroughsProps) {
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "All";
    }

    const initialRoles = ["All", ...walkthroughs.map((item) => item.role)];
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("roleFocus");

    if (fromUrl && initialRoles.includes(fromUrl)) {
      return fromUrl;
    }

    return "All";
  });

  const roles = useMemo(() => ["All", ...walkthroughs.map((item) => item.role)], [walkthroughs]);

  const filtered = useMemo(() => {
    if (selectedRole === "All") {
      return walkthroughs;
    }

    return walkthroughs.filter((walkthrough) => walkthrough.role === selectedRole);
  }, [selectedRole, walkthroughs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (selectedRole === "All") {
      params.delete("roleFocus");
    } else {
      params.set("roleFocus", selectedRole);
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [selectedRole]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#d8caad] bg-[#fff4df] p-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#4f685b]">Role Focus</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              aria-pressed={selectedRole === role}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedRole === role
                  ? "border-[#1b4b79] bg-[#1b4b79] text-white"
                  : "border-[#35506b] bg-[#f8f0e3] text-[#233d5a] hover:bg-[#233d5a] hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((walkthrough) => (
          <article key={walkthrough.role} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-[#20372c]">{walkthrough.role} Walkthrough</h3>
                <p className="mt-1 max-w-3xl text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Mission:</span> {walkthrough.mission}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Onboarding", "Daily", "Escalation"].map((label) => (
                  <span key={label} className="rounded-full border border-[#d0c4a7] bg-[#faf3e2] px-2.5 py-1 text-[0.68rem] font-semibold text-[#5d6b61]">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <details className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed]" open>
                <summary className="list-none cursor-pointer px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">First five clicks</p>
                  <p className="mt-1 text-sm text-[#445349]">The quickest path into this role&apos;s main workflow.</p>
                </summary>
                <div className="border-t border-[#e6d9bc] px-3 py-2">
                  <ol className="list-inside list-decimal space-y-1 text-sm text-[#445349]">
                    {walkthrough.firstFiveClicks.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </details>
              <details className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed]">
                <summary className="list-none cursor-pointer px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Daily workflow</p>
                  <p className="mt-1 text-sm text-[#445349]">The recurring checks to keep this role moving.</p>
                </summary>
                <div className="border-t border-[#e6d9bc] px-3 py-2">
                  <ul className="list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {walkthrough.dailyWorkflow.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </details>
              <details className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed]">
                <summary className="list-none cursor-pointer px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Emergency priority</p>
                  <p className="mt-1 text-sm text-[#445349]">What matters first when the workflow is under pressure.</p>
                </summary>
                <div className="border-t border-[#e6d9bc] px-3 py-2">
                  <ul className="list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {walkthrough.emergencyPriority.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
