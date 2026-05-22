"use client";

import { useMemo, useState } from "react";

type GlossaryItem = {
  term: string;
  definition: string;
  detail?: string;
  category?: string;
};

type ManualGlossaryIndexProps = {
  items: GlossaryItem[];
};

export function ManualGlossaryIndex({ items }: ManualGlossaryIndexProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatches = activeCategory === "All" || item.category === activeCategory;
      const searchText = [item.term, item.definition, item.detail ?? "", item.category ?? ""].join(" ").toLowerCase();
      const queryMatches = !normalizedQuery || searchText.includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, items, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d4c5a7] bg-[#fff4df] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-[#445349]">Search the index, then open only the definitions you need.</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search deployment, webhook, OAuth, credential..."
            aria-label="Search glossary"
            className="w-full rounded-xl border border-[#c2b393] bg-[#fffdf6] px-4 py-2.5 text-sm text-[#1e342a] placeholder:text-[#6b7d73] lg:max-w-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === category
                  ? "border-[#1b4b79] bg-[#1b4b79] text-white"
                  : "border-[#35506b] bg-[#f8f0e3] text-[#233d5a] hover:bg-[#233d5a] hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#d8caad] bg-[#fffaf0]">
        <div className="grid gap-2 border-b border-[#e2d5b9] bg-[#fff6e8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6b61] md:grid-cols-[1fr_1.6fr]">
          <span>Term</span>
          <span>Definition</span>
        </div>
        <div className="divide-y divide-[#eadcc3]">
          {filteredItems.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[#566c60]">No glossary entries match this search.</p>
          ) : (
            filteredItems.map((item) => (
              <details key={item.term} className="group px-4 py-3">
                <summary className="list-none cursor-pointer">
                  <div className="grid gap-3 md:grid-cols-[1fr_1.6fr] md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#20372c]">{item.term}</p>
                        {item.category ? (
                          <span className="rounded-full border border-[#d0c4a7] bg-[#faf3e2] px-2 py-0.5 text-[0.68rem] font-semibold text-[#5d6b61]">
                            {item.category}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-[#445349]">{item.definition}</p>
                      <span className="mt-1 inline-flex rounded-full border border-[#cdbd9f] bg-[#fff9ed] px-2.5 py-1 text-[0.68rem] font-semibold text-[#35506b]">
                        View details
                      </span>
                    </div>
                  </div>
                </summary>
                {item.detail ? (
                  <div className="mt-3 rounded-xl border border-[#dfcfb2] bg-[#fff8eb] p-3 text-sm text-[#445349]">
                    {item.detail}
                  </div>
                ) : null}
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
