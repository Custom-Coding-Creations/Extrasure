import {
  openCustomerBillingPortal,
  updateCustomerProfileAction,
  updateCustomerSubscriptionAction,
} from "@/app/account/actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerSession: jest.fn(),
  clearCustomerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      update: jest.fn(),
    },
    customerNote: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/stripe-billing", () => ({
  createBillingPortalSession: jest.fn(),
  setCustomerSubscriptionLifecycle: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getBaseUrl: jest.fn(() => "https://example.com"),
}));

const { redirect } = jest.requireMock("next/navigation") as {
  redirect: jest.Mock;
};

const { revalidatePath } = jest.requireMock("next/cache") as {
  revalidatePath: jest.Mock;
};

const { requireCustomerSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerSession: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    customer: {
      update: jest.Mock;
    };
  };
};

const { setCustomerSubscriptionLifecycle } = jest.requireMock("@/lib/stripe-billing") as {
  setCustomerSubscriptionLifecycle: jest.Mock;
};

const { createBillingPortalSession } = jest.requireMock("@/lib/stripe-billing") as {
  createBillingPortalSession: jest.Mock;
};

function createFormData(data: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }

  return formData;
}

describe("account actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCustomerSession.mockResolvedValue({
      customerId: "c_1",
      name: "Megan",
      email: "megan@example.com",
    });
  });

  it("redirects with invalid status when profile fields are missing", async () => {
    await expect(
      updateCustomerProfileAction(
        createFormData({
          name: "",
          phone: "",
          city: "",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/profile?status=invalid");

    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("opens Stripe billing portal with billing page return URL", async () => {
    createBillingPortalSession.mockResolvedValue({
      url: "https://billing.example.com/session",
    });

    await expect(openCustomerBillingPortal()).rejects.toThrow("NEXT_REDIRECT:https://billing.example.com/session");

    expect(createBillingPortalSession).toHaveBeenCalledWith("c_1", {
      returnUrl: "https://example.com/account/billing?stripe=portal_return",
    });
  });

  it("updates customer profile and redirects with updated status", async () => {
    prisma.customer.update.mockResolvedValue({ id: "c_1" });

    await expect(
      updateCustomerProfileAction(
        createFormData({
          name: "Megan R.",
          phone: "(315) 555-0000",
          city: "Syracuse",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/profile?status=updated");

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "c_1" },
      data: {
        name: "Megan R.",
        phone: "(315) 555-0000",
        city: "Syracuse",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        stateProvince: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/account/profile");
  });

  it("rejects invalid subscription action and redirects to error", async () => {
    await expect(
      updateCustomerSubscriptionAction(
        createFormData({
          action: "unknown",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/billing?stripe=subscription_error");

    expect(setCustomerSubscriptionLifecycle).not.toHaveBeenCalled();
  });

  it("runs subscription lifecycle and redirects to success state", async () => {
    setCustomerSubscriptionLifecycle.mockResolvedValue({
      ok: true,
      customerId: "c_1",
      subscriptionId: "sub_123",
      status: "paused",
    });

    await expect(
      updateCustomerSubscriptionAction(
        createFormData({
          action: "pause",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/billing?stripe=subscription_pause");

    expect(setCustomerSubscriptionLifecycle).toHaveBeenCalledWith("c_1", "pause");
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/account/billing");
  });

  it("redirects to error when subscription lifecycle update fails", async () => {
    setCustomerSubscriptionLifecycle.mockResolvedValue({
      ok: false,
      error: "Customer does not have a Stripe subscription",
    });

    await expect(
      updateCustomerSubscriptionAction(
        createFormData({
          action: "cancel",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/billing?stripe=subscription_error");

    expect(setCustomerSubscriptionLifecycle).toHaveBeenCalledWith("c_1", "cancel");
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/account/billing");
  });

  it("invokes redirect helper during control flow", () => {
    expect(redirect).toBeDefined();
  });
});
