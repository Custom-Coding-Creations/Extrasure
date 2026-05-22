"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ManualSecretRevealButton } from "@/components/admin/manual-secret-reveal-button";
import { ManualSecretsByCategoryClient, PlatformSection } from "@/components/admin/manual/manual-types";

type ManualPlatformOperationsProps = {
  sections: PlatformSection[];
  secretsByCategory: ManualSecretsByCategoryClient;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ManualPlatformOperations({ sections, secretsByCategory }: ManualPlatformOperationsProps) {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("platformSearch") ?? "";
  });
  const [activeId, setActiveId] = useState(() => {
    const fallback = sections[0]?.id ?? "";

    if (typeof window === "undefined") {
      return fallback;
    }

    const params = new URLSearchParams(window.location.search);
    const fromUrlPlatform = params.get("platformFocus");

    if (fromUrlPlatform && sections.some((section) => section.id === fromUrlPlatform)) {
      return fromUrlPlatform;
    }

    return fallback;
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sections;
    }

    return sections.filter((section) => {
      const haystack = [
        section.title,
        section.purpose,
        section.plainEnglish,
        section.whyItExists,
        ...section.setupChecklist,
        ...section.dailyChecks,
        ...section.troubleshooting,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, sections]);

  const activeSection =
    filteredSections.find((section) => section.id === activeId) ??
    filteredSections[0] ??
    sections.find((section) => section.id === activeId) ??
    null;
  const selectedTabId = activeSection?.id ?? "";

  const sectionSecrets = activeSection ? secretsByCategory[activeSection.category] ?? [] : [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (!selectedTabId || selectedTabId === sections[0]?.id) {
      params.delete("platformFocus");
    } else {
      params.set("platformFocus", selectedTabId);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      params.delete("platformSearch");
    } else {
      params.set("platformSearch", trimmedQuery);
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [selectedTabId, query, sections]);

  function activateTabByIndex(index: number) {
    const section = filteredSections[index];

    if (!section) {
      return;
    }

    setActiveId(section.id);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (filteredSections.length === 0) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      activateTabByIndex((index + 1) % filteredSections.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      activateTabByIndex((index - 1 + filteredSections.length) % filteredSections.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      activateTabByIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      activateTabByIndex(filteredSections.length - 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d1c4a5] bg-[#fff3df] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-[#3f5648]">
            Choose a platform to reduce noise and focus on one operational domain at a time.
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter platforms and checklists"
            className="w-full max-w-sm rounded-xl border border-[#c2b393] bg-[#fffdf6] px-4 py-2.5 text-sm text-[#1e342a] placeholder:text-[#6b7d73]"
            aria-label="Filter platform operations"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Platform sections">
        {filteredSections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveId(section.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            id={`platform-tab-${section.id}`}
            aria-controls={`platform-panel-${section.id}`}
            aria-selected={selectedTabId === section.id}
            tabIndex={selectedTabId === section.id ? 0 : -1}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
              selectedTabId === section.id
                ? "border-[#1b4b79] bg-[#1b4b79] text-white"
                : "border-[#35506b] bg-[#f8f0e3] text-[#233d5a] hover:bg-[#233d5a] hover:text-white"
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {!activeSection ? (
        <p className="rounded-xl border border-[#d5c7ab] bg-[#fff9ed] p-4 text-sm text-[#4b6055]">
          No platform matches this filter. Try a broader keyword.
        </p>
      ) : (
        <article
          role="tabpanel"
          id={`platform-panel-${activeSection.id}`}
          aria-labelledby={`platform-tab-${activeSection.id}`}
          className="space-y-4 rounded-2xl border border-[#cdbf9f] bg-[#fffaf0] p-4 sm:p-5"
        >
          <div className="rounded-xl border border-[#d7c9ad] bg-[#fff3df] p-4">
            <h3 className="text-xl font-semibold text-[#1c3429]">{activeSection.title}</h3>
            <p className="mt-2 text-sm text-[#2f4338]">{activeSection.purpose}</p>
            <p className="mt-2 text-sm text-[#445349]">{activeSection.plainEnglish}</p>
            <p className="mt-2 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Why this exists:</span> {activeSection.whyItExists}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">External Links</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {activeSection.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer" className="text-[#234a70] underline underline-offset-2">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Setup Checklist</h4>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {activeSection.setupChecklist.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Daily Checks</h4>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {activeSection.dailyChecks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Troubleshooting</h4>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
              {activeSection.troubleshooting.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Stored Credentials</h4>
            <p className="mt-2 text-xs text-[#5d7267]">
              Password values are encrypted at rest and masked on screen.
            </p>
            {sectionSecrets.length === 0 ? (
              <p className="mt-3 text-sm text-[#566c60]">No credentials saved in this section yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {sectionSecrets.map((secret) => (
                  <article key={secret.id} className="rounded-lg border border-[#d3c3a5] bg-[#fff9ed] p-3">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-semibold text-[#20372c]">{secret.title}</p>
                        <p className="text-xs text-[#5d7267]">Platform: {secret.platform}</p>
                        <p className="text-xs text-[#5d7267]">Username: {secret.username ?? "Not set"}</p>
                        <p className="text-xs text-[#5d7267]">Last rotated: {formatDate(secret.lastRotatedAt)}</p>
                        <p className="text-xs text-[#5d7267]">Last updated: {formatDate(secret.updatedAt)}</p>
                        {secret.portalUrl ? (
                          <a
                            href={secret.portalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-[#234a70] underline underline-offset-2"
                          >
                            Open portal
                          </a>
                        ) : null}
                        {secret.notes ? <p className="mt-2 text-xs text-[#445349]">{secret.notes}</p> : null}
                      </div>
                      <ManualSecretRevealButton secretId={secret.id} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
