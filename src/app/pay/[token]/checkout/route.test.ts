import { NextRequest } from "next/server";
import { POST } from "@/app/pay/[token]/checkout/route";

jest.mock("@/lib/customer-billing-access", () => ({
  inspectInvoiceAccessToken: jest.fn(),
}));

jest.mock("@/lib/stripe-billing", () => ({
  getCustomerInvoiceSnapshot: jest.fn(),
  createInvoiceCheckoutSession: jest.fn(),
}));

const { inspectInvoiceAccessToken } = jest.requireMock("@/lib/customer-billing-access") as {
  inspectInvoiceAccessToken: jest.Mock;
};

const { getCustomerInvoiceSnapshot, createInvoiceCheckoutSession } = jest.requireMock("@/lib/stripe-billing") as {
  getCustomerInvoiceSnapshot: jest.Mock;
  createInvoiceCheckoutSession: jest.Mock;
};

describe("POST /pay/[token]/checkout", () => {
  it("redirects to renewal route for expired token", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: false, reason: "expired" });

    const req = new NextRequest("https://example.com/pay/token123/checkout", { method: "POST" });
    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay?error=expired&token=token123");
  });

  it("redirects to checkout URL for valid token and invoice", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1", exp: Date.now() + 10_000 } });
    getCustomerInvoiceSnapshot.mockResolvedValue({
      invoice: { id: "inv_1", status: "open" },
    });
    createInvoiceCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_123" });

    const req = new NextRequest("https://example.com/pay/token123/checkout", { method: "POST" });
    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(createInvoiceCheckoutSession).toHaveBeenCalledWith("inv_1", expect.objectContaining({ context: "customer" }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/cs_123");
  });
});
