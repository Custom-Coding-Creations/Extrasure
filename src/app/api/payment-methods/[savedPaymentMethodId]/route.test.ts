import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/payment-methods/[savedPaymentMethodId]/route";

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/payment-preferences", () => ({
  setDefaultSavedPaymentMethod: jest.fn(),
  removeSavedPaymentMethod: jest.fn(),
}));

const { requireCustomerApiSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerApiSession: jest.Mock;
};

const { setDefaultSavedPaymentMethod, removeSavedPaymentMethod } = jest.requireMock(
  "@/lib/payment-preferences",
) as {
  setDefaultSavedPaymentMethod: jest.Mock;
  removeSavedPaymentMethod: jest.Mock;
};

function params(savedPaymentMethodId = "spm_1") {
  return { params: Promise.resolve({ savedPaymentMethodId }) };
}

function createPatchRequest(payload: unknown) {
  return new NextRequest("https://example.com/api/payment-methods/spm_1", {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

describe("/api/payment-methods/[savedPaymentMethodId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("DELETE returns 401 when unauthorized", async () => {
    requireCustomerApiSession.mockResolvedValue(null);

    const response = await DELETE(new NextRequest("https://example.com", { method: "DELETE" }), params());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
  });

  it("DELETE returns 404 when method not found", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    removeSavedPaymentMethod.mockResolvedValue(false);

    const response = await DELETE(new NextRequest("https://example.com", { method: "DELETE" }), params("spm_missing"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Payment method not found" });
  });

  it("DELETE returns 200 on success", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    removeSavedPaymentMethod.mockResolvedValue(true);

    const response = await DELETE(new NextRequest("https://example.com", { method: "DELETE" }), params());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });

  it("PATCH returns 401 when unauthorized", async () => {
    requireCustomerApiSession.mockResolvedValue(null);

    const response = await PATCH(createPatchRequest({ action: "set-default" }), params());
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
  });

  it("PATCH returns 400 for invalid JSON", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    const request = new NextRequest("https://example.com/api/payment-methods/spm_1", {
      method: "PATCH",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const response = await PATCH(request, params());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Invalid JSON payload" });
  });

  it("PATCH returns 400 for unsupported action", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });

    const response = await PATCH(createPatchRequest({ action: "noop" }), params());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Unsupported action" });
  });

  it("PATCH returns 404 when method not found", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    setDefaultSavedPaymentMethod.mockResolvedValue(false);

    const response = await PATCH(createPatchRequest({ action: "set-default" }), params("spm_missing"));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Payment method not found" });
  });

  it("PATCH returns 200 on success", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    setDefaultSavedPaymentMethod.mockResolvedValue(true);

    const response = await PATCH(createPatchRequest({ action: "set-default" }), params());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });
});
