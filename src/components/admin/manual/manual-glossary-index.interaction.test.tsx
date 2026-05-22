/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ManualGlossaryIndex } from "@/components/admin/manual/manual-glossary-index";

const items = [
  {
    term: "Deployment",
    definition: "A newly published version of the website.",
    detail: "Use this term for production publishing.",
    category: "Operations",
  },
  {
    term: "Webhook",
    definition: "An automatic event message from one system to another.",
    detail: "Used by Stripe for payment updates.",
    category: "Integrations",
  },
];

describe("manual-glossary-index interactions", () => {
  it("filters terms by search and category", () => {
    render(<ManualGlossaryIndex items={items} />);

    expect(screen.getByText("Deployment")).not.toBeNull();
    expect(screen.getByText("Webhook")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^operations$/i }));
    expect(screen.getByText("Deployment")).not.toBeNull();
    expect(screen.queryByText("Webhook")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /search glossary/i }), {
      target: { value: "stripe" },
    });

    expect(screen.queryByText("Deployment")).toBeNull();
    expect(screen.getByText("Webhook")).not.toBeNull();
  });
});
