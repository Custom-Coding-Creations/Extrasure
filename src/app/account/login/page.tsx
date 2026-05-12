import { LoginClient } from "@/app/account/login/login-client";

type CustomerLoginPageProps = {
  searchParams?: Promise<{
    reset?: string;
    oauth_error?: string;
  }>;
};

export default async function CustomerLoginPage({ searchParams }: CustomerLoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const resetDone = params?.reset === "done";
  const oauthErrorCode = params?.oauth_error ?? "";

  return (
    <LoginClient resetDone={resetDone} oauthErrorCode={oauthErrorCode} />
  );
}
