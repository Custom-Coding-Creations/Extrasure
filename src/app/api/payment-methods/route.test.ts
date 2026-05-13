import { GET } from "@/app/api/payment-methods/route";

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/payment-preferences", () => ({
  getCustomerPaymentMethods: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
    },
  },
}));

const { requireCustomerApiSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerApiSession: jest.Mock;
};

const { getCustomerPaymentMethods } = jest.requireMock("@/lib/payment-preferences") as {
  getCustomerPaymentMethods: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      findUnique: jest.Mock;
    };
  };
};

describe("GET /api/payment-methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    requireCustomerApiSession.mockResolvedValue(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
  });

  it("returns methods and preference when authorized", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    getCustomerPaymentMethods.mockResolvedValue([
      {
        id: "spm_1",
        type: "card",
        brand: "visa",
        last4: "4242",
        isDefault: true,
      },
    ]);
    prisma.customer.findUnique.mockResolvedValue({
      preferredPaymentMethod: "card",
      autopayEnabled: true,
      autopayMethodType: "card",
      achDiscountEligible: true,
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      methods: [
        {
          id: "spm_1",
          type: "card",
          brand: "visa",
          last4: "4242",
          isDefault: true,
        },
      ],
      preference: {
        preferredPaymentMethod: "card",
        autopayEnabled: true,
        autopayMethodType: "card",
        achDiscountEligible: true,
      },
    });
  });
});
