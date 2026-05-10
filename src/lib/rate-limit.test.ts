import { checkRateLimit } from "@/lib/rate-limit";

describe("rate-limit", () => {
  it("allows requests until max and blocks after", () => {
    const key = `test-${Date.now()}`;

    const first = checkRateLimit(key, 2, 60_000);
    const second = checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
