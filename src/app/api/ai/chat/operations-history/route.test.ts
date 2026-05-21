import { GET } from "@/app/api/ai/chat/operations-history/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    auditEvent: {
      findMany: jest.fn(),
    },
  },
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    auditEvent: {
      findMany: jest.Mock;
    };
  };
};

describe("GET /api/ai/chat/operations-history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    prisma.auditEvent.findMany.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/ai/chat/operations-history") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns actor-scoped chatbot operation audit entries", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([
      {
        id: "audit_1",
        actor: "Owner",
        action: "chatbot_operation_executed",
        entity: "chatbot_operation",
        entityId: "chat_1",
        before: null,
        after: JSON.stringify({ operationAction: "list_technicians" }),
        timestamp: new Date("2026-05-14T10:00:00.000Z"),
      },
      {
        id: "audit_2",
        actor: "Owner",
        action: "chatbot_operation_denied",
        entity: "chatbot_operation",
        entityId: "chat_2",
        before: null,
        after: JSON.stringify({ operationAction: "cancel_appointment", allowedRoles: ["owner", "dispatch"] }),
        timestamp: new Date("2026-05-14T09:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/ai/chat/operations-history?limit=10") as never);

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.capabilities).toEqual(
      expect.objectContaining({
        canViewAllScope: true,
        viewerRole: "owner",
      }),
    );
    expect(payload.entries).toHaveLength(2);
    expect(payload.entries[0]).toEqual(
      expect.objectContaining({
        action: "list_technicians",
        status: "success",
        source: "audit",
      }),
    );
    expect(payload.entries[1]).toEqual(
      expect.objectContaining({
        action: "cancel_appointment",
        status: "error",
        source: "audit",
      }),
    );

    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          actor: "Owner",
          entity: "chatbot_operation",
        }),
        take: 10,
      }),
    );
  });

  it("caps limit parameter at 100", async () => {
    await GET(new Request("http://localhost/api/ai/chat/operations-history?limit=1000") as never);

    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }),
    );
  });

  it("allows owner to request all-actor history scope", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([
      {
        id: "audit_3",
        actor: "Dispatch",
        action: "chatbot_operation_executed",
        entity: "chatbot_operation",
        entityId: "chat_9",
        before: null,
        after: JSON.stringify({ operationAction: "list_appointments" }),
        timestamp: new Date("2026-05-14T11:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/ai/chat/operations-history?scope=all") as never);

    expect(response.status).toBe(200);
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entity: "chatbot_operation",
          action: expect.any(Object),
        }),
      }),
    );

    const whereArg = prisma.auditEvent.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(whereArg.actor).toBeUndefined();
  });

  it("returns 403 when non-owner requests all-actor scope", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Dispatch", role: "dispatch" });

    const response = await GET(new Request("http://localhost/api/ai/chat/operations-history?scope=all") as never);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
  });

  it("returns non-owner capability metadata for self scope", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Dispatch", role: "dispatch" });

    const response = await GET(new Request("http://localhost/api/ai/chat/operations-history?scope=self") as never);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.capabilities).toEqual(
      expect.objectContaining({
        canViewAllScope: false,
        viewerRole: "dispatch",
      }),
    );
  });
});
