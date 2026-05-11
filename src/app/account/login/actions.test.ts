import {
  loginCustomer,
  requestPasswordResetAction,
  resetPasswordAction,
  signupCustomer,
} from "@/app/account/login/actions";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: (key: string) => {
      if (key === "x-forwarded-for") {
        return "127.0.0.1";
      }

      return null;
    },
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({ ok: true })),
}));

jest.mock("@/lib/customer-auth", () => ({
  createCustomerAccountFromSignup: jest.fn(),
  createCustomerSession: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetCustomerPassword: jest.fn(),
  setCustomerSession: jest.fn(),
  validateCustomerCredentials: jest.fn(),
  validateNewPassword: jest.fn(() => true),
}));

const { createCustomerAccountFromSignup, createCustomerSession, requestPasswordReset, resetCustomerPassword, setCustomerSession, validateCustomerCredentials } =
  jest.requireMock("@/lib/customer-auth") as {
    createCustomerAccountFromSignup: jest.Mock;
    createCustomerSession: jest.Mock;
    requestPasswordReset: jest.Mock;
    resetCustomerPassword: jest.Mock;
    setCustomerSession: jest.Mock;
    validateCustomerCredentials: jest.Mock;
  };

function createFormData(data: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }

  return formData;
}

describe("account login actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateCustomerCredentials.mockResolvedValue({
      ok: true,
      identity: {
        customerId: "c_1",
        email: "megan@example.com",
        name: "Megan",
        status: "active",
      },
    });
    createCustomerSession.mockResolvedValue("session-token");
  });

  it("creates a new self-serve customer account on signup", async () => {
    createCustomerAccountFromSignup.mockResolvedValue({
      ok: true,
      identity: {
        customerId: "c_2",
        email: "new@example.com",
        name: "New Customer",
        status: "active",
      },
    });

    await expect(
      signupCustomer(
        { message: "" },
        createFormData({
          name: "New Customer",
          email: "new@example.com",
          phone: "(315) 555-0200",
          city: "Syracuse",
          password: "Password123!",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account");

    expect(createCustomerAccountFromSignup).toHaveBeenCalledWith({
      name: "New Customer",
      email: "new@example.com",
      phone: "(315) 555-0200",
      city: "Syracuse",
      password: "Password123!",
    });
    expect(setCustomerSession).toHaveBeenCalledWith("session-token");
  });

  it("returns a message when signup fields are missing", async () => {
    const result = await signupCustomer(
      { message: "" },
      createFormData({
        name: "",
        email: "",
        phone: "",
        city: "",
        password: "",
      }),
    );

    expect(result.message).toContain("name, email, phone, city, and password");
  });

  it("redirects to the reset password page after requesting a reset token", async () => {
    requestPasswordReset.mockResolvedValue({ token: "reset-token" });

    await expect(
      requestPasswordResetAction(
        { message: "" },
        createFormData({
          email: "client@example.com",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/reset-password?token=reset-token");

    expect(requestPasswordReset).toHaveBeenCalledWith("client@example.com");
  });

  it("completes a password reset and returns to sign in", async () => {
    resetCustomerPassword.mockResolvedValue({ ok: true });

    await expect(
      resetPasswordAction(
        { message: "" },
        createFormData({
          token: "reset-token",
          password: "Password123!",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account/login?reset=done");

    expect(resetCustomerPassword).toHaveBeenCalledWith("reset-token", "Password123!");
  });

  it("signs in existing customer accounts", async () => {
    await expect(
      loginCustomer(
        { message: "" },
        createFormData({
          email: "megan@example.com",
          password: "Password123!",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/account");

    expect(validateCustomerCredentials).toHaveBeenCalledWith("megan@example.com", "Password123!");
    expect(createCustomerSession).toHaveBeenCalled();
    expect(setCustomerSession).toHaveBeenCalledWith("session-token");
  });
});
