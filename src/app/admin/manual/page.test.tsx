/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

jest.mock("@/components/admin/admin-shell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-shell">{children}</div>,
}));

jest.mock("@/components/admin/admin-manual-assistant", () => ({
  AdminManualAssistant: () => <div data-testid="manual-assistant">assistant</div>,
}));

jest.mock("@/components/admin/admin-manual-diagrams", () => ({
  AdminManualDiagrams: () => <div data-testid="manual-diagrams">diagrams</div>,
}));

jest.mock("@/components/admin/manual/manual-top-controls", () => ({
  ManualTopControls: ({ sections }: { sections: Array<{ id: string; label: string }> }) => (
    <div data-testid="top-controls">{sections.map((section) => section.label).join("|")}</div>
  ),
}));

jest.mock("@/components/admin/manual/manual-role-walkthroughs", () => ({
  ManualRoleWalkthroughs: ({ walkthroughs }: { walkthroughs: Array<{ role: string }> }) => (
    <div data-testid="role-walkthroughs">{walkthroughs.map((walkthrough) => walkthrough.role).join("|")}</div>
  ),
}));

jest.mock("@/components/admin/manual/manual-platform-operations", () => ({
  ManualPlatformOperations: ({ sections }: { sections: Array<{ title: string }> }) => (
    <div data-testid="platform-operations">{sections.map((section) => section.title).join("|")}</div>
  ),
}));

jest.mock("@/components/admin/manual/manual-glossary-index", () => ({
  ManualGlossaryIndex: ({ items }: { items: Array<{ term: string }> }) => (
    <div data-testid="glossary-index">{items.map((item) => item.term).join("|")}</div>
  ),
}));

jest.mock("@/components/admin/manual/manual-section-frame", () => ({
  ManualSectionFrame: ({ title, summary, children }: { title: string; summary?: string; children: React.ReactNode }) => (
    <section data-testid={`section-${title}`}>
      <h2>{title}</h2>
      {summary ? <p>{summary}</p> : null}
      <div>{children}</div>
    </section>
  ),
}));

jest.mock("@/app/admin/manual/actions", () => ({
  createManualSecretAction: jest.fn(),
  deleteManualSecretAction: jest.fn(),
  updateManualSecretAction: jest.fn(),
}));

jest.mock("@/lib/admin-auth", () => ({
  getAdminSession: jest.fn(),
}));

jest.mock("@/lib/admin-manual-store", () => ({
  getManualCategories: jest.fn(),
  listManualSecretsByCategory: jest.fn(),
}));

import { getAdminSession } from "@/lib/admin-auth";
import { getManualCategories, listManualSecretsByCategory } from "@/lib/admin-manual-store";

const mockedGetAdminSession = getAdminSession as jest.MockedFunction<typeof getAdminSession>;
const mockedGetManualCategories = getManualCategories as jest.MockedFunction<typeof getManualCategories>;
const mockedListManualSecretsByCategory = listManualSecretsByCategory as jest.MockedFunction<typeof listManualSecretsByCategory>;

let AdminManualPage: typeof import("@/app/admin/manual/page").default;

describe("AdminManualPage", () => {
  beforeAll(async () => {
    const pageModule = await import("@/app/admin/manual/page");
    AdminManualPage = pageModule.default;
  });

  beforeEach(() => {
    mockedGetAdminSession.mockReset();
    mockedGetManualCategories.mockReset();
    mockedListManualSecretsByCategory.mockReset();

    mockedGetManualCategories.mockReturnValue(["vercel", "github", "stripe", "openai", "database", "oauth", "operations"]);
    mockedListManualSecretsByCategory.mockResolvedValue({
      vercel: [],
      github: [],
      stripe: [],
      openai: [],
      database: [],
      oauth: [],
      operations: [],
    });
  });

  it("renders the main manual sections for an owner", async () => {
    mockedGetAdminSession.mockResolvedValue({ role: "owner", name: "Owner" } as never);

    const tree = await AdminManualPage();
    render(tree);

    expect(screen.getByTestId("top-controls").textContent).toContain("Owner Credentials");
    expect(screen.getByTestId("section-Executive Start Here")).not.toBeNull();
    expect(screen.getByTestId("section-Credential Vault Management")).not.toBeNull();
    expect(screen.getByTestId("glossary-index").textContent).toContain("Deployment");
    expect(screen.getByTestId("platform-operations").textContent).toContain("Vercel Hosting and Deployments");
  });

  it("omits the owner credential section for non-owner sessions", async () => {
    mockedGetAdminSession.mockResolvedValue({ role: "dispatch", name: "Dispatcher" } as never);

    const tree = await AdminManualPage();
    render(tree);

    expect(screen.getByTestId("top-controls").textContent).not.toContain("Owner Credentials");
    expect(screen.queryByTestId("section-Credential Vault Management")).toBeNull();
  });
});