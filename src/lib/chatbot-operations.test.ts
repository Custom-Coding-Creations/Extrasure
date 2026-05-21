import { executeChatbotOperation } from "@/lib/chatbot-operations";

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock("@/lib/scheduling-engine", () => ({
  calculateAvailableSlots: jest.fn(),
  validateBookingFitsSchedule: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    serviceBooking: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
    },
    technician: {
      findMany: jest.fn(),
    },
    technicianScheduleException: {
      findMany: jest.fn(),
    },
    serviceCatalogItem: {
      findUnique: jest.fn(),
    },
  },
}));

const { recordAuditEvent } = jest.requireMock("@/lib/audit-log") as {
  recordAuditEvent: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    serviceBooking: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    job: {
      findMany: jest.Mock;
    };
    technician: {
      findMany: jest.Mock;
    };
    technicianScheduleException: {
      findMany: jest.Mock;
    };
    serviceCatalogItem: {
      findUnique: jest.Mock;
    };
  };
};

describe("chatbot-operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_AUTH_SECRET = "test-admin-secret";

    recordAuditEvent.mockResolvedValue(undefined);

    prisma.technician.findMany.mockResolvedValue([
      {
        id: "tech_1",
        name: "Tech One",
        status: "available",
        utilizationPercent: 42,
      },
    ]);
    prisma.technicianScheduleException.findMany.mockResolvedValue([]);

    prisma.serviceBooking.create.mockResolvedValue({
      id: "book_1",
      status: "requested",
      scheduledAt: null,
      technicianId: null,
      serviceCatalogItemId: "svc_1",
    });
    prisma.serviceBooking.findMany.mockResolvedValue([]);
    prisma.job.findMany.mockResolvedValue([]);
  });

  it("returns auth_required when no admin session", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "list_appointments",
        payload: { limit: 10 },
      },
      adminSession: null,
      chatSessionId: "chat_1",
    });

    expect(result.status).toBe("error");
    expect(result.result).toEqual(expect.objectContaining({ code: "auth_required" }));
  });

  it("denies roles that are not allowed for an action", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "list_technicians",
      },
      adminSession: {
        name: "Bookkeeper",
        role: "accountant",
        exp: Date.now() + 60_000,
      },
      chatSessionId: "chat_2",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("not allowed");
    expect(result.result).toEqual(
      expect.objectContaining({
        code: "forbidden",
      }),
    );
  });

  it("rejects payloads with unsupported fields", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "get_availability",
        payload: {
          date: "2030-01-02",
          serviceCatalogItemId: "svc_1",
          unknownField: "x",
        },
      },
      adminSession: {
        name: "Owner",
        role: "owner",
        exp: Date.now() + 60_000,
      },
      chatSessionId: "chat_3",
    });

    expect(result.status).toBe("error");
    expect(result.result).toEqual(expect.objectContaining({ code: "invalid_payload" }));
    expect(result.message).toContain("Unsupported payload field");
  });

  it("returns requires_confirmation for write actions on first call", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "schedule_appointment",
        payload: {
          serviceCatalogItemId: "svc_1",
          customerId: "c_1",
          contactName: "Megan R",
          contactEmail: "megan@example.com",
          contactPhone: "315-555-0100",
          preferredDate: "2030-01-02",
          preferredWindow: "morning",
          addressLine1: "123 Main St",
          city: "Syracuse",
        },
      },
      adminSession: {
        name: "Dispatch",
        role: "dispatch",
        exp: Date.now() + 60_000,
      },
      chatSessionId: "chat_4",
    });

    expect(result.status).toBe("requires_confirmation");
    expect(result.confirmationToken).toBeTruthy();
    expect(prisma.serviceBooking.create).not.toHaveBeenCalled();
  });

  it("rejects invalid confirmation token for write actions", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "cancel_appointment",
        payload: {
          bookingId: "book_1",
        },
        confirmationToken: "invalid-token",
      },
      adminSession: {
        name: "Dispatch",
        role: "dispatch",
        exp: Date.now() + 60_000,
      },
      chatSessionId: "chat_5",
    });

    expect(result.status).toBe("error");
    expect(result.result).toEqual(expect.objectContaining({ code: "invalid_confirmation_token" }));
  });

  it("executes write action after valid confirmation token", async () => {
    const operationPayload = {
      serviceCatalogItemId: "svc_1",
      customerId: "c_1",
      contactName: "Megan R",
      contactEmail: "megan@example.com",
      contactPhone: "315-555-0100",
      preferredDate: "2030-01-02",
      preferredWindow: "morning",
      addressLine1: "123 Main St",
      city: "Syracuse",
    };

    const adminSession = {
      name: "Dispatch",
      role: "dispatch" as const,
      exp: Date.now() + 60_000,
    };

    const firstPass = await executeChatbotOperation({
      operation: {
        action: "schedule_appointment",
        payload: operationPayload,
      },
      adminSession,
      chatSessionId: "chat_6",
    });

    expect(firstPass.status).toBe("requires_confirmation");
    expect(firstPass.confirmationToken).toBeTruthy();

    const secondPass = await executeChatbotOperation({
      operation: {
        action: "schedule_appointment",
        payload: operationPayload,
        confirmationToken: firstPass.confirmationToken,
      },
      adminSession,
      chatSessionId: "chat_6",
    });

    expect(secondPass.status).toBe("success");
    expect(secondPass.result).toEqual(
      expect.objectContaining({
        bookingId: "book_1",
      }),
    );
    expect(prisma.serviceBooking.create).toHaveBeenCalledTimes(1);
  });

  it("runs read operations for authorized roles", async () => {
    const result = await executeChatbotOperation({
      operation: {
        action: "list_technicians",
      },
      adminSession: {
        name: "Owner",
        role: "owner",
        exp: Date.now() + 60_000,
      },
      chatSessionId: "chat_7",
    });

    expect(result.status).toBe("success");
    expect(result.result).toEqual(
      expect.objectContaining({
        technicians: expect.any(Array),
      }),
    );
  });
});
