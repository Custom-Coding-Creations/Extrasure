import { POST } from "@/app/api/payment-methods/sync/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiRole: jest.fn(),
}));

jest.mock("@/lib/payment-preferences", () => ({
  syncAllSavedPaymentMethodsFromStripe: jest.fn(),
}));

const { requireAdminApiRole } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiRole: jest.Mock;
};

const { syncAllSavedPaymentMethodsFromStripe } = jest.requireMock("@/lib/payment-preferences") as {
  syncAllSavedPaymentMethodsFromStripe: jest.Mock;
};

describe("POST /api/payment-methods/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    requireAdminApiRole.mockResolvedValue(null);

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
  });

  it("returns synced customer count when authorized", async () => {
    requireAdminApiRole.mockResolvedValue({ id: "u_1", role: "owner" });
    syncAllSavedPaymentMethodsFromStripe.mockResolvedValue({ count: 7 });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(requireAdminApiRole).toHaveBeenCalledWith(["owner", "accountant"]);
    expect(payload).toEqual({
      ok: true,
      syncedCustomers: 7,
    });
  });
});
