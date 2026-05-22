jest.mock("@/lib/admin-manual-retrieval-corpus", () => ({
  retrievalCorpus: [
    {
      id: "chunk-weak",
      path: "docs/notes.md",
      title: "notes",
      text: "dns",
    },
    {
      id: "chunk-strong",
      path: "README.md",
      title: "DNS setup",
      text: "Use Vercel domain settings and verify SITE_URL values.",
    },
  ],
}));

import { retrieveAdminManualContext } from "@/lib/admin-manual-retrieval";

describe("admin-manual-retrieval", () => {
  it("filters low-signal chunks and keeps stronger matches", async () => {
    const result = await retrieveAdminManualContext("dns records");

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe("chunk-strong");
    expect(result.matches[0].score).toBeGreaterThanOrEqual(4);
    expect(result.sourcePaths).toEqual(["README.md"]);
  });
});
