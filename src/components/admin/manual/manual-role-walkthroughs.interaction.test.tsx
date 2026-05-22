/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ManualRoleWalkthroughs } from "@/components/admin/manual/manual-role-walkthroughs";

const walkthroughs = [
  {
    role: "Owner",
    mission: "Owner mission",
    firstFiveClicks: ["Owner 1"],
    dailyWorkflow: ["Owner daily"],
    emergencyPriority: ["Owner emergency"],
  },
  {
    role: "Dispatch",
    mission: "Dispatch mission",
    firstFiveClicks: ["Dispatch 1"],
    dailyWorkflow: ["Dispatch daily"],
    emergencyPriority: ["Dispatch emergency"],
  },
];

describe("manual-role-walkthroughs interactions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/manual");
  });

  it("hydrates role focus from URL and persists new selection", () => {
    window.history.replaceState({}, "", "/admin/manual?roleFocus=Dispatch");

    render(<ManualRoleWalkthroughs walkthroughs={walkthroughs} />);

    expect(screen.queryByText("Dispatch mission")).not.toBeNull();
    expect(screen.queryByText("Owner mission")).toBeNull();
    expect(screen.getByRole("button", { name: /^dispatch$/i }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /^owner$/i }));

    expect(screen.queryByText("Owner mission")).not.toBeNull();
    expect(window.location.search).toContain("roleFocus=Owner");
    expect(screen.getByRole("button", { name: /^owner$/i }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));

    expect(window.location.search.includes("roleFocus=")).toBe(false);
  });
});
