import { NextRequest } from "next/server";
import { POST } from "@/app/pay/[token]/portal/route";

jest.mock("@/lib/customer-billing-access", () => ({
  inspectInvoiceAccessToken: jest.fn(),
}));

jest.mock("@/lib/stripe-billing", () => ({
  getCustomerInvoiceSnapshot: jest.fn(),
  createBillingPortalSession: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
}));

const { inspectInvoiceAccessToken } = jest.requireMock("@/lib/customer-billing-access") as {
  inspectInvoiceAccessToken: jest.Mock;
};

const { getCustomerInvoiceSnapshot, createBillingPortalSession } = jest.requireMock("@/lib/stripe-billing") as {
  getCustomerInvoiceSnapshot: jest.Mock;
  createBillingPortalSession: jest.Mock;
};

describe("POST /pay/[token]/portal", () => {
  it("redirects to not_found for invalid token", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: false, reason: "invalid_signature" });

    const req = new NextRequest("https://example.com/pay/token123/portal", { method: "POST" });
    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay?error=not_found");
  });

  it("redirects to portal URL when token and invoice are valid", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1", exp: Date.now() + 10_000 } });
    getCustomerInvoiceSnapshot.mockResolvedValue({ customer: { id: "c_1" } });
    createBillingPortalSession.mockResolvedValue({ url: "https://billing.stripe.com/session/test" });

    const req = new NextRequest("https://example.com/pay/token123/portal", { method: "POST" });
    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(createBillingPortalSession).toHaveBeenCalledWith("c_1", expect.objectContaining({ returnUrl: "https://example.com/pay/token123?stripe=portal_return" }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/session/test");
  });
});
