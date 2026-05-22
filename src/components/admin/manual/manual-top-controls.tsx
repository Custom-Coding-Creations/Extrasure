"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type SectionLink = {
  id: string;
  label: string;
  tags?: string[];
};

type ManualTopControlsProps = {
  sections: SectionLink[];
};

const PINNED_STORAGE_KEY = "extrasure-admin-manual-pinned";
const RECENT_STORAGE_KEY = "extrasure-admin-manual-recent";
const RECENT_LIMIT = 5;

export function ManualTopControls({ sections }: ManualTopControlsProps) {
  const [query, setQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(() => {
    const fallbackId = sections[0]?.id ?? "";

    if (typeof window === "undefined") {
      return fallbackId;
    }

    const hashId = window.location.hash.replace(/^#/, "");
    if (hashId && sections.some((section) => section.id === hashId)) {
      return hashId;
    }

    return fallbackId;
  });
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        searchText: [section.label, ...(section.tags ?? [])].join(" ").toLowerCase(),
      })),
    [sections],
  );

  const matchedSections = useMemo(() => {
    const targetQuery = query.trim().toLowerCase();

    if (!targetQuery) {
      return [] as SectionLink[];
    }

    return normalizedSections
      .filter((section) => section.searchText.includes(targetQuery))
      .map(({ id, label, tags }) => ({ id, label, tags }))
      .slice(0, 6);
  }, [normalizedSections, query]);

  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);

  useEffect(() => {
    try {
      const storedPinned = window.localStorage.getItem(PINNED_STORAGE_KEY);
      const storedRecent = window.localStorage.getItem(RECENT_STORAGE_KEY);

      if (storedPinned) {
        const parsedPinned = JSON.parse(storedPinned) as string[];
        setPinnedIds(parsedPinned.filter((id) => sectionById.has(id)));
      }

      if (storedRecent) {
        const parsedRecent = JSON.parse(storedRecent) as string[];
        setRecentIds(parsedRecent.filter((id) => sectionById.has(id)));
      }
    } catch {
      setPinnedIds([]);
      setRecentIds([]);
    }
  }, [sectionById]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // ignore storage failures
    }
  }, [pinnedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentIds.slice(0, RECENT_LIMIT)));
    } catch {
      // ignore storage failures
    }
  }, [recentIds]);

  const recordRecentSection = useCallback(
    (sectionId: string) => {
      setRecentIds((current) => {
        const next = [sectionId, ...current.filter((item) => item !== sectionId)].slice(0, RECENT_LIMIT);
        return next;
      });
    },
    [],
  );

  const navigateToSection = useCallback(
    (sectionId: string) => {
      if (!sectionById.has(sectionId)) {
        return;
      }

      window.location.hash = sectionId;
      setActiveSectionId(sectionId);
      recordRecentSection(sectionId);

      const target = document.getElementById(sectionId);
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
      }
    },
    [recordRecentSection, sectionById],
  );

  const togglePinnedSection = useCallback((sectionId: string) => {
    setPinnedIds((current) => {
      if (current.includes(sectionId)) {
        return current.filter((id) => id !== sectionId);
      }

      return [sectionId, ...current].slice(0, RECENT_LIMIT);
    });
  }, []);

  function jumpToBestMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetQuery = query.trim().toLowerCase();

    if (!targetQuery) {
      return;
    }

    const exact = normalizedSections.find((section) => section.label.toLowerCase() === targetQuery);
    const partial = normalizedSections.find((section) => section.searchText.includes(targetQuery));
    const hit = exact ?? partial;

    if (hit) {
      navigateToSection(hit.id);
    }
  }

  const openSectionElementByHash = useCallback((hashValue: string) => {
    if (!hashValue) {
      return;
    }

    const sectionId = hashValue.replace(/^#/, "");
    if (!sectionId) {
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, []);

  const openSectionFromHash = useCallback((hashValue: string) => {
    if (!hashValue) {
      return;
    }

    const sectionId = hashValue.replace(/^#/, "");
    if (!sectionId) {
      return;
    }

    setActiveSectionId(sectionId);
    recordRecentSection(sectionId);
    openSectionElementByHash(hashValue);
  }, [openSectionElementByHash, recordRecentSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const id = visible.target.getAttribute("id");
        if (id) {
          setActiveSectionId(id);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.4, 0.6],
      },
    );

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    elements.forEach((element) => observer.observe(element));

    return () => {
      elements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    openSectionFromHash(window.location.hash);

    function handleHashChange() {
      openSectionFromHash(window.location.hash);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [openSectionElementByHash, openSectionFromHash]);

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const inEditableField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !inEditableField) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, []);

  function setAllSectionsOpen(nextOpen: boolean) {
    const sectionElements = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-manual-section='true']"));

    sectionElements.forEach((element) => {
      element.open = nextOpen;
    });
  }

  return (
    <section className="sticky top-4 z-20 rounded-3xl border border-[#ccbda0] bg-[linear-gradient(90deg,#fff7e8_0%,#fff1de_100%)] p-4 shadow-[0_12px_35px_rgba(42,55,38,0.14)]">
      <div className="flex flex-col gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#536b5f]">Manual Navigation Command Bar</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#d6c7a7] bg-[#fff9ee] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#566b60]">Pinned</p>
              <span className="rounded-full bg-[#ece2ca] px-2 py-0.5 text-[0.68rem] font-semibold text-[#516157]">{pinnedIds.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pinnedIds.length === 0 ? (
                <p className="text-sm text-[#66786f]">Pin frequently used sections for quick return.</p>
              ) : (
                pinnedIds.map((sectionId) => {
                  const section = sectionById.get(sectionId);
                  if (!section) {
                    return null;
                  }

                  return (
                    <button
                      key={sectionId}
                      type="button"
                      onClick={() => navigateToSection(sectionId)}
                      className="rounded-full border border-[#35506b] bg-[#f7efe2] px-3 py-1.5 text-xs font-semibold text-[#233d5a] transition hover:bg-[#233d5a] hover:text-white"
                    >
                      {section.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#d6c7a7] bg-[#fff9ee] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#566b60]">Recently Used</p>
              <span className="rounded-full bg-[#ece2ca] px-2 py-0.5 text-[0.68rem] font-semibold text-[#516157]">{recentIds.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentIds.length === 0 ? (
                <p className="text-sm text-[#66786f]">Open a section to build your recent list.</p>
              ) : (
                recentIds.map((sectionId) => {
                  const section = sectionById.get(sectionId);
                  if (!section) {
                    return null;
                  }

                  return (
                    <button
                      key={sectionId}
                      type="button"
                      onClick={() => navigateToSection(sectionId)}
                      className="rounded-full border border-[#d0c4a7] bg-[#faf3e2] px-3 py-1.5 text-xs font-semibold text-[#5d6b61] transition hover:bg-[#5d6b61] hover:text-white"
                    >
                      {section.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Manual section shortcuts" className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center gap-1">
              <a
                href={`#${section.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigateToSection(section.id);
                }}
                aria-current={activeSectionId === section.id ? "location" : undefined}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeSectionId === section.id
                    ? "border-[#1b4b79] bg-[#1b4b79] text-white"
                    : "border-[#35506b] bg-[#f7efe2] text-[#233d5a] hover:bg-[#233d5a] hover:text-white"
                }`}
              >
                {section.label}
              </a>
              <button
                type="button"
                aria-label={`${pinnedIds.includes(section.id) ? "Unpin" : "Pin"} ${section.label}`}
                onClick={() => togglePinnedSection(section.id)}
                className={`rounded-full border px-2 py-1 text-[0.68rem] font-semibold transition ${
                  pinnedIds.includes(section.id)
                    ? "border-[#7b5936] bg-[#7b5936] text-white"
                    : "border-[#d0c4a7] bg-[#fff9ee] text-[#6b4a2d] hover:bg-[#6b4a2d] hover:text-white"
                }`}
              >
                {pinnedIds.includes(section.id) ? "Pinned" : "+"}
              </button>
            </div>
          ))}
        </nav>
        <form onSubmit={jumpToBestMatch} className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a section fast (payments, oauth, incidents, glossary)..."
            className="w-full rounded-xl border border-[#bfae8d] bg-[#fffdf6] px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#6a7c72]"
            aria-label="Find section"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#173c2d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10281f]"
          >
            Jump
          </button>
        </form>
        {query.trim().length > 0 ? (
          <div className="rounded-2xl border border-[#d6c7a7] bg-[#fff9ee] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#566b60]">Search Matches</p>
              <span className="rounded-full bg-[#ece2ca] px-2 py-0.5 text-[0.68rem] font-semibold text-[#516157]">{matchedSections.length}</span>
            </div>
            {matchedSections.length === 0 ? (
              <p className="mt-2 text-sm text-[#66786f]">No direct section matches. Try broader terms like operations, incidents, stripe, auth, or glossary.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {matchedSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => navigateToSection(section.id)}
                    className="rounded-full border border-[#35506b] bg-[#f7efe2] px-3 py-1.5 text-xs font-semibold text-[#233d5a] transition hover:bg-[#233d5a] hover:text-white"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllSectionsOpen(true)}
            className="rounded-full border border-[#3d5d49] bg-[#f8efe2] px-3 py-1.5 text-xs font-semibold text-[#1d3a2b] transition hover:bg-[#1d3a2b] hover:text-white"
          >
            Expand All Sections
          </button>
          <button
            type="button"
            onClick={() => setAllSectionsOpen(false)}
            className="rounded-full border border-[#7b5936] bg-[#f8efe2] px-3 py-1.5 text-xs font-semibold text-[#6b4a2d] transition hover:bg-[#6b4a2d] hover:text-white"
          >
            Collapse All Sections
          </button>
        </div>
      </div>
    </section>
  );
}
