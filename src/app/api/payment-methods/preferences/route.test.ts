import { NextRequest } from "next/server";
import { POST } from "@/app/api/payment-methods/preferences/route";

jest.mock("@prisma/client", () => ({
  PaymentPreferenceMethod: {
    card: "card",
    ach: "ach",
    none: "none",
  },
}));

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/payment-preferences", () => ({
  updateCustomerPaymentPreferences: jest.fn(),
}));

const { requireCustomerApiSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerApiSession: jest.Mock;
};

const { updateCustomerPaymentPreferences } = jest.requireMock("@/lib/payment-preferences") as {
  updateCustomerPaymentPreferences: jest.Mock;
};

function createJsonRequest(payload: unknown) {
  return new NextRequest("https://example.com/api/payment-methods/preferences", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/payment-methods/preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    requireCustomerApiSession.mockResolvedValue(null);

    const response = await POST(createJsonRequest({ preferredMethod: "ach" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid JSON payload", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });

    const request = new NextRequest("https://example.com/api/payment-methods/preferences", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Invalid JSON payload" });
  });

  it("maps values and updates preferences", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    updateCustomerPaymentPreferences.mockResolvedValue({
      preferredPaymentMethod: "ach",
      autopayEnabled: true,
      autopayMethodType: "ach",
      achDiscountEligible: true,
    });

    const response = await POST(
      createJsonRequest({
        preferredMethod: "ach",
        autopayEnabled: true,
        autopayMethodType: "ach",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateCustomerPaymentPreferences).toHaveBeenCalledWith("c_1", {
      preferredMethod: "ach",
      autopayEnabled: true,
      autopayMethodType: "ach",
    });
    expect(payload).toEqual({
      ok: true,
      preference: {
        preferredPaymentMethod: "ach",
        autopayEnabled: true,
        autopayMethodType: "ach",
        achDiscountEligible: true,
      },
    });
  });
});
