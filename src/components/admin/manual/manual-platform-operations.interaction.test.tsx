/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ManualPlatformOperations } from "@/components/admin/manual/manual-platform-operations";

jest.mock("@/components/admin/manual-secret-reveal-button", () => ({
  ManualSecretRevealButton: () => <div>Reveal</div>,
}));

const sections = [
  {
    id: "vercel",
    category: "vercel",
    title: "Vercel Hosting and Deployments",
    purpose: "Vercel purpose",
    plainEnglish: "Vercel plain",
    whyItExists: "Vercel why",
    links: [{ label: "Vercel", href: "https://vercel.com" }],
    setupChecklist: ["Vercel setup"],
    dailyChecks: ["Vercel daily"],
    troubleshooting: ["Vercel troubleshoot"],
  },
  {
    id: "stripe",
    category: "stripe",
    title: "Stripe Payments and Billing",
    purpose: "Stripe purpose",
    plainEnglish: "Stripe plain",
    whyItExists: "Stripe why",
    links: [{ label: "Stripe", href: "https://stripe.com" }],
    setupChecklist: ["Stripe setup"],
    dailyChecks: ["Stripe daily"],
    troubleshooting: ["Stripe troubleshoot"],
  },
];

const secretsByCategory = {
  vercel: [],
  stripe: [
    {
      id: "secret_1",
      title: "Stripe Primary",
      platform: "Stripe",
      category: "stripe",
      portalUrl: null,
      username: "ops@company.com",
      notes: "Note",
      isActive: true,
      lastRotatedAt: null,
      updatedAt: new Date().toISOString(),
    },
  ],
};

describe("manual-platform-operations interactions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/manual");
  });

  it("hydrates platform focus and search from URL then persists updates", () => {
    window.history.replaceState({}, "", "/admin/manual?platformFocus=stripe&platformSearch=billing");

    render(<ManualPlatformOperations sections={sections} secretsByCategory={secretsByCategory} />);

    expect(screen.queryByRole("heading", { name: /stripe payments and billing/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /stripe payments and billing/i }).getAttribute("aria-selected")).toBe("true");

    const filterInput = screen.getByRole("textbox", { name: /filter platform operations/i });
    expect((filterInput as HTMLInputElement).value).toBe("billing");

    fireEvent.change(filterInput, { target: { value: "vercel" } });
    fireEvent.click(screen.getByRole("tab", { name: /vercel hosting and deployments/i }));

    expect(screen.queryByRole("heading", { name: /vercel hosting and deployments/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /vercel hosting and deployments/i }).getAttribute("aria-selected")).toBe("true");
    expect(window.location.search).toContain("platformSearch=vercel");
    expect(window.location.search.includes("platformFocus=")).toBe(false);
  });

  it("supports keyboard arrow navigation across platform tabs", () => {
    render(<ManualPlatformOperations sections={sections} secretsByCategory={secretsByCategory} />);

    const vercelTab = screen.getByRole("tab", { name: /vercel hosting and deployments/i });
    const stripeTab = screen.getByRole("tab", { name: /stripe payments and billing/i });

    expect(vercelTab.getAttribute("aria-selected")).toBe("true");

    (vercelTab as HTMLButtonElement).focus();
    fireEvent.keyDown(vercelTab, { key: "ArrowRight" });

    expect(stripeTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(stripeTab);
    expect(window.location.search).toContain("platformFocus=stripe");
  });
});
