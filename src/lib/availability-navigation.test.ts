import { getNextSlotIndex } from "@/lib/availability-navigation";

describe("availability navigation", () => {
  it("moves forward and backward cyclically", () => {
    expect(getNextSlotIndex(0, 4, "ArrowRight")).toBe(1);
    expect(getNextSlotIndex(3, 4, "ArrowRight")).toBe(0);
    expect(getNextSlotIndex(0, 4, "ArrowLeft")).toBe(3);
    expect(getNextSlotIndex(2, 4, "ArrowUp")).toBe(1);
  });

  it("supports home and end keys", () => {
    expect(getNextSlotIndex(2, 4, "Home")).toBe(0);
    expect(getNextSlotIndex(1, 4, "End")).toBe(3);
  });

  it("returns stable values for empty or unrelated input", () => {
    expect(getNextSlotIndex(0, 0, "ArrowRight")).toBe(-1);
    expect(getNextSlotIndex(2, 4, "Enter")).toBe(2);
  });
});
