import { NextRequest } from "next/server";
import { POST } from "@/app/api/payment-intent/route";

jest.mock("@/lib/customer-billing-access", () => ({
  inspectInvoiceAccessToken: jest.fn(),
}));

jest.mock("@/lib/stripe-billing", () => ({
  getPaymentClientSecret: jest.fn(),
  attachPaymentMethodPreference: jest.fn(),
  applyAchDiscountIfEligible: jest.fn(),
}));

const { inspectInvoiceAccessToken } = jest.requireMock("@/lib/customer-billing-access") as {
  inspectInvoiceAccessToken: jest.Mock;
};

const {
  getPaymentClientSecret,
  attachPaymentMethodPreference,
  applyAchDiscountIfEligible,
} = jest.requireMock("@/lib/stripe-billing") as {
  getPaymentClientSecret: jest.Mock;
  attachPaymentMethodPreference: jest.Mock;
  applyAchDiscountIfEligible: jest.Mock;
};

function createJsonRequest(payload: unknown) {
  return new NextRequest("https://example.com/api/payment-intent", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/payment-intent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const response = await POST(createJsonRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Token is required" });
  });

  it("returns 401 when token is expired", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: false, reason: "expired" });

    const response = await POST(createJsonRequest({ token: "tok_1" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Token expired" });
  });

  it("returns 401 when token is invalid", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: false, reason: "invalid" });

    const response = await POST(createJsonRequest({ token: "tok_1" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Invalid token" });
  });

  it("forwards savePaymentMethod=true by default", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1" } });
    getPaymentClientSecret.mockResolvedValue({
      clientSecret: "cs_1",
      sessionId: "csess_1",
      type: "checkout_session",
      paymentElementOptions: {},
      achDiscount: null,
      preferredPaymentMethod: "card",
      paymentIntentId: "pi_1",
      customerId: "c_1",
      amount: 100,
    });

    const response = await POST(createJsonRequest({ token: "tok_1" }));

    expect(response.status).toBe(200);
    expect(getPaymentClientSecret).toHaveBeenCalledWith("inv_1", {
      context: "customer",
      returnPath: "/pay/tok_1?stripe=success&session_id={CHECKOUT_SESSION_ID}",
      savePaymentMethod: true,
    });
    expect(attachPaymentMethodPreference).toHaveBeenCalledWith("pi_1", "card");
    expect(applyAchDiscountIfEligible).not.toHaveBeenCalled();
  });

  it("forwards savePaymentMethod=false when provided", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1" } });
    getPaymentClientSecret.mockResolvedValue({
      clientSecret: "cs_1",
      sessionId: "csess_1",
      type: "checkout_session",
      paymentElementOptions: {},
      achDiscount: null,
      preferredPaymentMethod: "card",
      paymentIntentId: "pi_1",
      customerId: "c_1",
      amount: 100,
    });

    const response = await POST(createJsonRequest({ token: "tok_1", savePaymentMethod: false }));

    expect(response.status).toBe(200);
    expect(getPaymentClientSecret).toHaveBeenCalledWith("inv_1", {
      context: "customer",
      returnPath: "/pay/tok_1?stripe=success&session_id={CHECKOUT_SESSION_ID}",
      savePaymentMethod: false,
    });
  });

  it("applies ACH discount when preferred method is ach", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1" } });
    getPaymentClientSecret.mockResolvedValue({
      clientSecret: "cs_1",
      sessionId: "csess_1",
      type: "checkout_session",
      paymentElementOptions: {},
      achDiscount: { discountedAmount: 97, savingsAmount: 3, originalAmount: 100, savings_percentage: 3 },
      preferredPaymentMethod: "ach",
      paymentIntentId: "pi_1",
      customerId: "c_1",
      amount: 100,
    });

    const response = await POST(createJsonRequest({ token: "tok_1" }));

    expect(response.status).toBe(200);
    expect(applyAchDiscountIfEligible).toHaveBeenCalledWith("pi_1", "c_1", 100);
  });
});
