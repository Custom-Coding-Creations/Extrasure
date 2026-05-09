"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  setAdminSession,
  validateOwnerCredentials,
} from "@/lib/admin-auth";

export type LoginState = {
  message: string;
};

export async function loginOwner(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { message: "Enter email and password." };
  }

  const result = validateOwnerCredentials(email, password);

  if (!result.ok) {
    return { message: result.message ?? "Authentication failed." };
  }

  const token = await createAdminSession(result.name ?? "Owner", result.role);
  await setAdminSession(token);

  redirect("/admin");
}

export async function logoutOwner() {
  await clearAdminSession();
  redirect("/owner-login");
}
