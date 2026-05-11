"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createCustomerAccountFromSignup,
  createCustomerSession,
  requestPasswordReset,
  resetCustomerPassword,
  setCustomerSession,
  validateCustomerCredentials,
  validateNewPassword,
} from "@/lib/customer-auth";

export type CustomerAuthState = {
  message: string;
};

async function getActionIpKey() {
  const headerStore = await headers();
  const xff = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const cfIp = headerStore.get("cf-connecting-ip")?.trim();

  return cfIp || realIp || xff || "unknown";
}

export async function loginCustomer(_prevState: CustomerAuthState, formData: FormData): Promise<CustomerAuthState> {
  const ip = await getActionIpKey();
  const limit = checkRateLimit(`customer-login:${ip}`, 10, 60_000);

  if (!limit.ok) {
    return { message: "Too many attempts. Please wait a minute and try again." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { message: "Enter email and password." };
  }

  const result = await validateCustomerCredentials(email, password);

  if (!result.ok) {
    return { message: result.message };
  }

  const token = await createCustomerSession({
    customerId: result.identity.customerId,
    email: result.identity.email,
    name: result.identity.name,
  });

  await setCustomerSession(token);
  redirect("/account");
}

export async function signupCustomer(_prevState: CustomerAuthState, formData: FormData): Promise<CustomerAuthState> {
  const ip = await getActionIpKey();
  const limit = checkRateLimit(`customer-signup:${ip}`, 6, 60_000);

  if (!limit.ok) {
    return { message: "Too many attempts. Please wait a minute and try again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!name || !email || !phone || !city || !password) {
    return { message: "Enter your name, email, phone, city, and password." };
  }

  if (!validateNewPassword(password)) {
    return { message: "Password must be at least 8 characters." };
  }

  const result = await createCustomerAccountFromSignup({
    name,
    email,
    phone,
    city,
    password,
  });

  if (!result.ok) {
    return { message: result.message };
  }

  const token = await createCustomerSession({
    customerId: result.identity.customerId,
    email: result.identity.email,
    name: result.identity.name,
  });

  await setCustomerSession(token);
  redirect("/account");
}

export async function requestPasswordResetAction(_prevState: CustomerAuthState, formData: FormData): Promise<CustomerAuthState> {
  const ip = await getActionIpKey();
  const limit = checkRateLimit(`customer-reset:${ip}`, 5, 60_000);

  if (!limit.ok) {
    return { message: "Too many attempts. Please wait a minute and try again." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { message: "Enter your email address." };
  }

  const result = await requestPasswordReset(email);

  if (!result.token) {
    return { message: "If an account exists for that email, you can reset your password after signing in." };
  }

  redirect(`/account/reset-password?token=${encodeURIComponent(result.token)}`);
}

export async function resetPasswordAction(_prevState: CustomerAuthState, formData: FormData): Promise<CustomerAuthState> {
  const ip = await getActionIpKey();
  const limit = checkRateLimit(`customer-reset-complete:${ip}`, 8, 60_000);

  if (!limit.ok) {
    return { message: "Too many attempts. Please wait a minute and try again." };
  }

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!token || !password) {
    return { message: "Enter a reset token and new password." };
  }

  if (!validateNewPassword(password)) {
    return { message: "Password must be at least 8 characters." };
  }

  const result = await resetCustomerPassword(token, password);

  if (!result.ok) {
    return { message: result.message };
  }

  redirect("/account/login?reset=done");
}
