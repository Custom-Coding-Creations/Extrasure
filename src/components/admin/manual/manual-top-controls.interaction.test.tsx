/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ManualTopControls } from "@/components/admin/manual/manual-top-controls";

class MockIntersectionObserver {
  observe() {
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

describe("manual-top-controls interactions", () => {
  beforeAll(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/admin/manual");
  });

  it("expands and collapses all manual sections", () => {
    const first = document.createElement("details");
    first.dataset.manualSection = "true";
    const second = document.createElement("details");
    second.dataset.manualSection = "true";
    second.open = true;
    document.body.append(first, second);

    render(
      <ManualTopControls
        sections={[
          { id: "quick-start", label: "Quick Start" },
          { id: "operating-guides", label: "Operating Guides" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse all sections/i }));

    expect(first.open).toBe(false);
    expect(second.open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /expand all sections/i }));

    expect(first.open).toBe(true);
    expect(second.open).toBe(true);
  });

  it("jumps to the best matching section from search", () => {
    render(
      <ManualTopControls
        sections={[
          { id: "quick-start", label: "Quick Start", tags: ["crisis"] },
          { id: "reference-security", label: "Reference and Security", tags: ["glossary", "vault"] },
        ]}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /find section/i }), {
      target: { value: "vault" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /jump/i }).closest("form") as HTMLFormElement);

    expect(window.location.hash).toBe("#reference-security");
    expect(screen.getByRole("link", { name: /reference and security/i }).getAttribute("aria-current")).toBe("location");
  });

  it("focuses search input when slash is pressed outside editable fields", () => {
    render(
      <ManualTopControls
        sections={[
          { id: "quick-start", label: "Quick Start" },
          { id: "reference-security", label: "Reference and Security" },
        ]}
      />,
    );

    const searchInput = screen.getByRole("textbox", { name: /find section/i });
    expect(document.activeElement).not.toBe(searchInput);

    fireEvent.keyDown(window, { key: "/" });

    expect(document.activeElement).toBe(searchInput);
  });

  it("opens a collapsed section when its shortcut link is clicked", () => {
    const details = document.createElement("details");
    details.id = "operating-guides";
    details.dataset.manualSection = "true";
    details.open = false;
    document.body.append(details);

    render(
      <ManualTopControls
        sections={[
          { id: "quick-start", label: "Quick Start" },
          { id: "operating-guides", label: "Operating Guides" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: /operating guides/i }));

    expect(details.open).toBe(true);
  });

  it("opens section from hash on load and hashchange", () => {
    const quickStart = document.createElement("details");
    quickStart.id = "quick-start";
    quickStart.dataset.manualSection = "true";
    quickStart.open = false;

    const reference = document.createElement("details");
    reference.id = "reference-security";
    reference.dataset.manualSection = "true";
    reference.open = false;

    document.body.append(quickStart, reference);
    window.history.replaceState({}, "", "/admin/manual#quick-start");

    render(
      <ManualTopControls
        sections={[
          { id: "quick-start", label: "Quick Start" },
          { id: "reference-security", label: "Reference and Security" },
        ]}
      />,
    );

    expect(quickStart.open).toBe(true);

    window.location.hash = "#reference-security";
    fireEvent(window, new HashChangeEvent("hashchange"));

    expect(reference.open).toBe(true);
  });
});
