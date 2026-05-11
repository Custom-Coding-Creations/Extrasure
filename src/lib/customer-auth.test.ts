import {
  createCustomerAccountFromSignup,
  createPasswordResetToken,
  requestPasswordReset,
  resetCustomerPassword,
} from "@/lib/customer-auth";

jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    customerAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    customerAccount: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

describe("customer-auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CUSTOMER_AUTH_SECRET = "test-customer-secret";
    process.env.ADMIN_AUTH_SECRET = "test-admin-secret";
  });

  it("creates a new customer account without an existing customer record", async () => {
    prisma.customerAccount.findUnique.mockResolvedValue(null);
    prisma.customer.findFirst.mockResolvedValue(null);
    prisma.customer.create.mockResolvedValue({
      id: "cust_123",
      name: "Megan R.",
      email: "megan@example.com",
      phone: "(315) 555-1212",
      city: "Syracuse",
    });
    prisma.customerAccount.create.mockResolvedValue({
      customerId: "cust_123",
      email: "megan@example.com",
      status: "active",
    });

    const result = await createCustomerAccountFromSignup({
      name: "Megan R.",
      email: "Megan@example.com",
      password: "Password123!",
      phone: "(315) 555-1212",
      city: "Syracuse",
    });

    expect(result.ok).toBe(true);
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Megan R.",
          email: "megan@example.com",
          phone: "(315) 555-1212",
          city: "Syracuse",
          activePlan: "none",
          lifecycle: "lead",
        }),
      }),
    );
    expect(prisma.customerAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "megan@example.com",
          authMethod: "password",
        }),
      }),
    );
  });

  it("returns a password reset token for a known active account", async () => {
    prisma.customerAccount.findUnique.mockResolvedValue({
      id: "acct_1",
      email: "client@example.com",
      status: "active",
    });

    const result = await requestPasswordReset("client@example.com");

    expect(result.token).toEqual(expect.any(String));
  });

  it("resets a password when given a valid reset token", async () => {
    prisma.customerAccount.findUnique.mockResolvedValue({
      id: "acct_1",
      status: "active",
    });
    prisma.customerAccount.update.mockResolvedValue({ id: "acct_1" });

    const token = createPasswordResetToken("client@example.com", 60);
    const result = await resetCustomerPassword(token, "NewPassword123!");

    expect(result.ok).toBe(true);
    expect(prisma.customerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acct_1" },
        data: expect.objectContaining({
          status: "active",
        }),
      }),
    );
  });

  it("rejects an expired reset token", async () => {
    const token = createPasswordResetToken("client@example.com", -1);

    const result = await resetCustomerPassword(token, "NewPassword123!");

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/invalid or expired/i);
  });
});
