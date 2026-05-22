import { AdminShell } from "@/components/admin/admin-shell";
import { ChatbotOperationsHistory } from "@/components/admin/chatbot-operations-history";
import { requireAdminRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminChatOperationsHistoryPage() {
  await requireAdminRole(["owner", "dispatch"]);

  return (
    <AdminShell
      title="Operations History"
      subtitle="Review operation outcomes, confirmation events, and audit-linked activity from the Operations Console."
    >
      <ChatbotOperationsHistory />
    </AdminShell>
  );
}
