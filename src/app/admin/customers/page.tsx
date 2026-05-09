import { AdminShell } from "@/components/admin/admin-shell";
import { customers } from "@/lib/admin-data";

export default function AdminCustomersPage() {
  return (
    <AdminShell
      title="CRM and Account Health"
      subtitle="Track customers, properties, lifecycle stage, and recurring plan status to improve retention and collections."
    >
      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Last Service</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-[#ecdfc3] last:border-0">
                <td className="px-4 py-3 font-semibold text-[#1b2f25]">
                  {customer.name}
                  <p className="text-xs font-normal text-[#5d7267]">{customer.city}</p>
                </td>
                <td className="px-4 py-3 text-[#33453a]">
                  <p>{customer.phone}</p>
                  <p className="text-xs text-[#5d7267]">{customer.email}</p>
                </td>
                <td className="px-4 py-3 capitalize text-[#33453a]">{customer.activePlan.replace("_", " ")}</td>
                <td className="px-4 py-3 capitalize text-[#33453a]">{customer.lifecycle.replace("_", " ")}</td>
                <td className="px-4 py-3 text-[#33453a]">{customer.lastServiceDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
