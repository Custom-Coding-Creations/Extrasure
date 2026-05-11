import { Suspense } from "react";
import { ResetPasswordClient } from "@/app/account/reset-password/reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient />
    </Suspense>
  );
}
