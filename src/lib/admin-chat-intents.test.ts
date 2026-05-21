import { resolveAdminDirectAnswer, type AdminMetrics } from "@/lib/admin-chat-intents";

const metrics: AdminMetrics = {
  totalCustomers: 128,
  totalTechnicians: 9,
  totalJobs: 412,
  totalInvoices: 310,
  openInvoices: 42,
  succeededPaymentsLast30: 201,
  paidInvoicesLast30: 184,
  revenueLast30: 245678,
};

describe("resolveAdminDirectAnswer", () => {
  it("answers hosting questions", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Where is this website hosted?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("hosted on Vercel");
  });

  it("answers customer count with live metrics", () => {
    const answer = resolveAdminDirectAnswer({
      message: "How many customers do I have?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("128");
  });

  it("answers revenue prompt with formatted amount", () => {
    const answer = resolveAdminDirectAnswer({
      message: "How much money did I make in the last month?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("$2456.78");
  });

  it("returns invoice workflow for customer-specific invoice prompt", () => {
    const answer = resolveAdminDirectAnswer({
      message: "I need to create an invoice for Susan Edwards. Where do I go?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("/admin/invoices");
    expect(answer).toContain("Susan Edwards");
  });

  it("returns secure credential guidance for Google Cloud credentials", () => {
    const answer = resolveAdminDirectAnswer({
      message: "How do I find my Google Cloud username and password?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("cannot reveal credentials");
    expect(answer).toContain("Admin Manual");
  });

  it("returns null when no deterministic admin intent matches", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Explain the tone of our service pages",
      language: "en",
      metrics,
    });

    expect(answer).toBeNull();
  });

  it("answers where env vars are managed", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Where do I change environment variables?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("Environment variables are managed in Vercel");
  });

  it("answers where to find deployment and function logs", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Where can I check build and function logs?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("Deployments");
    expect(answer).toContain("Functions");
  });

  it("returns webhook replay guidance for Stripe webhook failures", () => {
    const answer = resolveAdminDirectAnswer({
      message: "How do I replay failed Stripe webhooks?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("Stripe Dashboard > Developers > Webhooks");
    expect(answer).toContain("Replay");
  });

  it("returns rollback guidance for bad deploys", () => {
    const answer = resolveAdminDirectAnswer({
      message: "We had a bad deploy, how do I rollback?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("last stable deployment");
    expect(answer).toContain("revert PR");
  });

  it("returns Prisma/Postgres troubleshooting steps", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Database is down with P1001, how do I troubleshoot it?",
      language: "en",
      metrics,
    });

    expect(answer).toContain("Verify DATABASE_URL");
    expect(answer).toContain("P1001");
  });

  it("supports Spanish hosting prompt", () => {
    const answer = resolveAdminDirectAnswer({
      message: "Donde esta alojado este sitio web?",
      language: "es",
      metrics,
    });

    expect(answer).toContain("alojado en Vercel");
  });

  it("supports accented Spanish hosting prompt with punctuation", () => {
    const answer = resolveAdminDirectAnswer({
      message: "¿Dónde está alojado este sitio web?",
      language: "es",
      metrics,
    });

    expect(answer).toContain("alojado en Vercel");
  });

  it("supports accented Spanish DNS troubleshooting prompt", () => {
    const answer = resolveAdminDirectAnswer({
      message: "¿Dónde está gestionado mi DNS y cómo lo arreglo?",
      language: "es",
      metrics,
    });

    expect(answer).toContain("DNS");
    expect(answer).toContain("Vercel Domains");
  });
});
