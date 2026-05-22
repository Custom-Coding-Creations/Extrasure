/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

jest.mock("@/components/admin/admin-shell", () => ({
  AdminShell: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section data-testid="admin-shell">
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

jest.mock("@/components/admin/chatbot-operations-console", () => ({
  ChatbotOperationsConsole: () => <div data-testid="operations-console">console</div>,
}));

jest.mock("@/lib/admin-auth", () => ({
  requireAdminRole: jest.fn(),
}));

import { requireAdminRole } from "@/lib/admin-auth";

const mockedRequireAdminRole = requireAdminRole as jest.MockedFunction<typeof requireAdminRole>;

let AdminChatOperationsPage: typeof import("@/app/admin/chat-operations/page").default;

describe("AdminChatOperationsPage", () => {
  beforeAll(async () => {
    const pageModule = await import("@/app/admin/chat-operations/page");
    AdminChatOperationsPage = pageModule.default;
  });

  beforeEach(() => {
    mockedRequireAdminRole.mockReset();
    mockedRequireAdminRole.mockResolvedValue({ name: "Owner", role: "owner", exp: Date.now() + 60_000 } as never);
  });

  it("enforces owner/dispatch role and renders operations console", async () => {
    const tree = await AdminChatOperationsPage();
    render(tree);

    expect(mockedRequireAdminRole).toHaveBeenCalledWith(["owner", "dispatch"]);
    expect(screen.getByRole("heading", { name: /operations console/i })).not.toBeNull();
    expect(screen.getByTestId("operations-console")).not.toBeNull();
  });
});
