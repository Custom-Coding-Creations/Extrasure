/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { AccountHomeTimeline } from "@/components/account/account-home-timeline";
import type { AccountHomeIntelligence } from "@/lib/account-home-intelligence";

type TimelineItem = AccountHomeIntelligence["timeline"]["items"][number];
type TimelineFilter = AccountHomeIntelligence["timeline"]["filters"][number];

const filters: TimelineFilter[] = [
  { id: "all", label: "All", count: 4 },
  { id: "service", label: "Service", count: 1 },
  { id: "billing", label: "Billing", count: 1 },
  { id: "support", label: "Support", count: 1 },
  { id: "ai", label: "AI", count: 1 },
];

const items: TimelineItem[] = [
  {
    id: "ai_1",
    title: "AI protection review updated",
    detail: "AI summary detail",
    badge: "AI",
    tone: "info",
    category: "ai",
    occurredAt: "2026-05-13T12:00:00.000Z",
    icon: "spark",
  },
  {
    id: "service_1",
    title: "Visit scheduled",
    detail: "Service detail",
    badge: "Service",
    tone: "success",
    category: "service",
    occurredAt: "2026-05-12T12:00:00.000Z",
    icon: "shield",
  },
  {
    id: "billing_1",
    title: "Invoice open",
    detail: "Billing detail",
    badge: "Billing",
    tone: "warning",
    category: "billing",
    occurredAt: "2026-05-11T12:00:00.000Z",
    icon: "receipt",
  },
  {
    id: "support_1",
    title: "Support guidance posted",
    detail: "Support detail",
    badge: "Support",
    tone: "info",
    category: "support",
    occurredAt: "2026-05-10T12:00:00.000Z",
    icon: "message",
  },
];

describe("account-home-timeline interactions", () => {
  it("switches visible timeline cards when filter tabs are clicked", () => {
    render(<AccountHomeTimeline filters={filters} items={items} />);

    expect(screen.queryByText("Visit scheduled")).not.toBeNull();
    expect(screen.queryByText("Invoice open")).not.toBeNull();
    expect(screen.queryByText("Support guidance posted")).not.toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /billing/i }));

    expect(screen.queryByText("Invoice open")).not.toBeNull();
    expect(screen.queryByText("Visit scheduled")).toBeNull();
    expect(screen.queryByText("Support guidance posted")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /support/i }));

    expect(screen.queryByText("Support guidance posted")).not.toBeNull();
    expect(screen.queryByText("Invoice open")).toBeNull();
  });
});