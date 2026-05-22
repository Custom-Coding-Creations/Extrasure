import { buildAdminManualKnowledgeContext } from "@/lib/admin-manual-knowledge";

describe("admin-manual-knowledge", () => {
  it("returns empty context for no direct internal match", () => {
    const result = buildAdminManualKnowledgeContext("compose a limerick about rain");

    expect(result.confidence).toBe("low");
    expect(result.contextText).toBe("");
    expect(result.sourceTitles).toEqual([]);
  });

  it("returns Extrasure-specific DNS guidance for DNS questions", () => {
    const result = buildAdminManualKnowledgeContext("I need to update dns and domain records");

    expect(result.confidence === "high" || result.confidence === "medium").toBe(true);
    expect(result.contextText).toContain("Vercel");
    expect(result.contextText).toContain("SITE_URL");
  });
});
