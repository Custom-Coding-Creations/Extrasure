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

function formatRelativeCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

type CompactDisclosureProps = {
  title: string;
  summary: string;
  items: string[];
  defaultOpen?: boolean;
};

function CompactDisclosure({ title, summary, items, defaultOpen = false }: CompactDisclosureProps) {
  return (
    <details className="rounded-xl border border-[#deceb0] bg-[#fff4df]" open={defaultOpen}>
      <summary className="list-none cursor-pointer px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">{title}</h4>
            <p className="mt-1 text-sm text-[#4b5f55]">{summary}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#cdbd9f] bg-[#fff9ed] px-2.5 py-1 text-[0.68rem] font-semibold text-[#35506b]">
            {formatRelativeCount(items.length, "item")}
          </span>
        </div>
      </summary>
      <div className="border-t border-[#deceb0] px-4 py-3">
        <ul className="space-y-1 text-sm text-[#445349]">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6f5c3d]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
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
  const sectionSummary = activeSection
    ? [
        formatRelativeCount(activeSection.links.length, "link"),
        formatRelativeCount(activeSection.setupChecklist.length, "setup step"),
        formatRelativeCount(activeSection.dailyChecks.length, "daily check"),
        formatRelativeCount(activeSection.troubleshooting.length, "issue path"),
        formatRelativeCount(sectionSecrets.length, "credential"),
      ]
    : [];

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-[#1c3429]">{activeSection.title}</h3>
                <p className="mt-2 text-sm font-medium text-[#2f4338]">{activeSection.purpose}</p>
                <p className="mt-2 max-w-3xl text-sm text-[#445349]">{activeSection.plainEnglish}</p>
                <p className="mt-2 max-w-3xl text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Why this exists:</span> {activeSection.whyItExists}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionSummary.map((stat) => (
                  <span
                    key={stat}
                    className="rounded-full border border-[#d0c4a7] bg-[#faf3e2] px-2.5 py-1 text-[0.68rem] font-semibold text-[#5d6b61]"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <CompactDisclosure
              title="External Links"
              summary="Open the primary dashboard and documentation pages for this platform."
              items={activeSection.links.map((link) => `${link.label} · ${link.href}`)}
              defaultOpen={false}
            />
            <CompactDisclosure
              title="Setup Checklist"
              summary="Use this when provisioning or verifying the platform after a change."
              items={activeSection.setupChecklist}
              defaultOpen={false}
            />
            <CompactDisclosure
              title="Daily Checks"
              summary="The minimum daily review for healthy operations."
              items={activeSection.dailyChecks}
              defaultOpen={true}
            />
          </div>

          <CompactDisclosure
            title="Troubleshooting"
            summary="Open when a deployment, auth, or API path is misbehaving."
            items={activeSection.troubleshooting}
            defaultOpen={false}
          />

          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Stored Credentials</h4>
            <p className="mt-2 text-xs text-[#5d7267]">
              Password values are encrypted at rest and masked on screen.
            </p>
            {sectionSecrets.length === 0 ? (
              <p className="mt-3 text-sm text-[#566c60]">No credentials saved in this section yet.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-[#d3c3a5] bg-[#fff9ed]">
                <div className="hidden border-b border-[#e4d4b5] bg-[#fff6e8] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#5d6b61] md:grid md:grid-cols-[1.15fr_0.9fr_1fr_0.9fr_auto] md:gap-3">
                  <span>Name</span>
                  <span>Platform</span>
                  <span>Access</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="divide-y divide-[#e8dcc1]">
                  {sectionSecrets.map((secret) => (
                    <div key={secret.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.15fr_0.9fr_1fr_0.9fr_auto] md:items-center md:gap-3">
                      <div>
                        <p className="font-semibold text-[#20372c]">{secret.title}</p>
                        {secret.notes ? <p className="mt-1 text-xs text-[#5d7267]">{secret.notes}</p> : null}
                      </div>
                      <p className="text-sm text-[#445349] md:text-xs">{secret.platform}</p>
                      <div className="text-sm text-[#445349] md:text-xs">
                        <p>Username: {secret.username ?? "Not set"}</p>
                        {secret.portalUrl ? (
                          <a
                            href={secret.portalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-[#234a70] underline underline-offset-2"
                          >
                            Open portal
                          </a>
                        ) : null}
                      </div>
                      <div className="text-sm text-[#445349] md:text-xs">
                        <p>Rotated: {formatDate(secret.lastRotatedAt)}</p>
                        <p>Updated: {formatDate(secret.updatedAt)}</p>
                      </div>
                      <div className="md:justify-self-end">
                        <ManualSecretRevealButton secretId={secret.id} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
