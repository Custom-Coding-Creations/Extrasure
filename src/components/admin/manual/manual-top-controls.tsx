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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        searchText: [section.label, ...(section.tags ?? [])].join(" ").toLowerCase(),
      })),
    [sections],
  );

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
      window.location.hash = hit.id;
      setActiveSectionId(hit.id);
      const target = document.getElementById(hit.id);
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
      }
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
    openSectionElementByHash(hashValue);
  }, [openSectionElementByHash]);

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
    openSectionElementByHash(window.location.hash);

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
        <nav aria-label="Manual section shortcuts" className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => {
                setActiveSectionId(section.id);
                const target = document.getElementById(section.id);
                if (target instanceof HTMLDetailsElement) {
                  target.open = true;
                }
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
