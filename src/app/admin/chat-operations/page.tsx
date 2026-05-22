import { AdminShell } from "@/components/admin/admin-shell";
import { ChatbotOperationsConsole } from "@/components/admin/chatbot-operations-console";
import { requireAdminRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminChatOperationsPage() {
  await requireAdminRole(["owner", "dispatch"]);

  return (
    <AdminShell
      title="Operations Console"
      subtitle="Run appointment and technician operations from an admin-only workspace with explicit confirmation safeguards."
    >
      <ChatbotOperationsConsole />
    </AdminShell>
  );
}
