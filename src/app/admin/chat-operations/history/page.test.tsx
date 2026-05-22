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

jest.mock("@/components/admin/chatbot-operations-history", () => ({
  ChatbotOperationsHistory: () => <div data-testid="operations-history">history</div>,
}));

jest.mock("@/lib/admin-auth", () => ({
  requireAdminRole: jest.fn(),
}));

import { requireAdminRole } from "@/lib/admin-auth";

const mockedRequireAdminRole = requireAdminRole as jest.MockedFunction<typeof requireAdminRole>;

let AdminChatOperationsHistoryPage: typeof import("@/app/admin/chat-operations/history/page").default;

describe("AdminChatOperationsHistoryPage", () => {
  beforeAll(async () => {
    const pageModule = await import("@/app/admin/chat-operations/history/page");
    AdminChatOperationsHistoryPage = pageModule.default;
  });

  beforeEach(() => {
    mockedRequireAdminRole.mockReset();
    mockedRequireAdminRole.mockResolvedValue({ name: "Owner", role: "owner", exp: Date.now() + 60_000 } as never);
  });

  it("enforces owner/dispatch role and renders operations history", async () => {
    const tree = await AdminChatOperationsHistoryPage();
    render(tree);

    expect(mockedRequireAdminRole).toHaveBeenCalledWith(["owner", "dispatch"]);
    expect(screen.getByRole("heading", { name: /operations history/i })).not.toBeNull();
    expect(screen.getByTestId("operations-history")).not.toBeNull();
  });
});
