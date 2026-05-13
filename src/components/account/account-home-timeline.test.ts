import { filterTimelineItems } from "@/components/account/account-home-timeline";
import type { AccountHomeIntelligence } from "@/lib/account-home-intelligence";

type TimelineItem = AccountHomeIntelligence["timeline"]["items"][number];

function makeItem(overrides: Partial<TimelineItem>): TimelineItem {
  return {
    id: "item",
    title: "Timeline item",
    detail: "Detail",
    badge: "Service",
    tone: "info",
    category: "service",
    occurredAt: "2026-05-13T00:00:00.000Z",
    icon: "shield",
    ...overrides,
  };
}

describe("account-home-timeline filter", () => {
  it("returns all items when the all filter is selected", () => {
    const items = [
      makeItem({ id: "service_1", category: "service" }),
      makeItem({ id: "billing_1", category: "billing" }),
      makeItem({ id: "support_1", category: "support" }),
      makeItem({ id: "ai_1", category: "ai" }),
    ];

    expect(filterTimelineItems(items, "all")).toHaveLength(4);
  });

  it("filters items by selected category", () => {
    const items = [
      makeItem({ id: "service_1", category: "service" }),
      makeItem({ id: "billing_1", category: "billing" }),
      makeItem({ id: "billing_2", category: "billing" }),
      makeItem({ id: "support_1", category: "support" }),
    ];

    expect(filterTimelineItems(items, "billing").map((item) => item.id)).toEqual(["billing_1", "billing_2"]);
    expect(filterTimelineItems(items, "support").map((item) => item.id)).toEqual(["support_1"]);
    expect(filterTimelineItems(items, "service").map((item) => item.id)).toEqual(["service_1"]);
  });

  it("returns an empty list when no items match the selected filter", () => {
    const items = [
      makeItem({ id: "billing_1", category: "billing" }),
      makeItem({ id: "billing_2", category: "billing" }),
    ];

    expect(filterTimelineItems(items, "support")).toEqual([]);
  });
});