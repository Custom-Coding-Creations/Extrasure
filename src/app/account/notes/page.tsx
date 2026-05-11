import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { createCustomerNote, logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

export default async function AccountNotesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId);

  if (!snapshot) {
    redirect("/account/login");
  }

  return (
    <AccountShell
      title="Messages"
      subtitle="Send notes to the service team and view customer-visible replies."
      activePath="/account/notes"
      logoutAction={logoutCustomer}
    >
      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <form action={createCustomerNote} className="space-y-3">
          <textarea
            name="body"
            required
            rows={4}
            className="w-full rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
            placeholder="Send a note to the service team..."
          />
          <button
            type="submit"
            className="rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Send Message
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {snapshot.notes.length ? (
            snapshot.notes.map((note) => (
              <article key={note.id} className="rounded-xl border border-[#d8cbaf] bg-[#fffdf6] p-3 text-sm">
                <p className="font-semibold text-[#1b2f25]">{note.authorName}</p>
                <p className="mt-1 whitespace-pre-wrap text-[#33453a]">{note.body}</p>
                <p className="mt-1 text-xs text-[#5d7267]">{new Date(note.createdAt).toLocaleString()}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5d7267]">No messages yet.</p>
          )}
        </div>
      </section>
    </AccountShell>
  );
}
