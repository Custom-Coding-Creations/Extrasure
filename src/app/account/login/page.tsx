import { Suspense } from "react";
import { LoginClient } from "@/app/account/login/login-client";

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
