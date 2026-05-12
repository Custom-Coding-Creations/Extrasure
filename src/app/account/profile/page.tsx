import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { logoutCustomer, updateCustomerProfileAction } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AccountProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);
  const params = searchParams ? await searchParams : undefined;

  if (!snapshot) {
    redirect("/account/login");
  }

  return (
    <AccountShell
      title="Profile"
      subtitle="Your account identity and current service profile details."
      activePath="/account/profile"
      logoutAction={logoutCustomer}
    >
      {params?.status === "updated" ? (
        <section className="mb-4 rounded-2xl border border-[#b8d8c6] bg-[#ecf9f0] p-4 text-sm text-[#1f4b33]">
          Profile details updated.
        </section>
      ) : null}
      {params?.status === "invalid" ? (
        <section className="mb-4 rounded-2xl border border-[#dec3a9] bg-[#fff4e8] p-4 text-sm text-[#7b3d13]">
          Name, phone, and city are required.
        </section>
      ) : null}

      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <h2 className="text-2xl text-[#1b2f25]">Account Details</h2>
        <form action={updateCustomerProfileAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267]" htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              required
              defaultValue={snapshot.customer.name}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-base text-[#1d2f25]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267]" htmlFor="email">Email</label>
            <input
              id="email"
              value={snapshot.customer.email}
              disabled
              readOnly
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-[#f3eee0] px-3 py-2 text-base text-[#33453a]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267]" htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              required
              defaultValue={snapshot.customer.phone}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-base text-[#1d2f25]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-[#5d7267]" htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              required
              defaultValue={snapshot.customer.city}
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-base text-[#1d2f25]"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Lifecycle</p>
            <p className="mt-1 capitalize text-base text-[#1b2f25]">{snapshot.customer.lifecycle.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Last Service</p>
            <p className="mt-1 text-base text-[#1b2f25]">{new Date(snapshot.customer.lastServiceDate).toLocaleDateString()}</p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
            >
              Save Profile
            </button>
          </div>
        </form>
      </section>
    </AccountShell>
  );
}
