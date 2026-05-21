import { AdminShell } from "@/components/admin/admin-shell";
import { ManualSecretRevealButton } from "@/components/admin/manual-secret-reveal-button";
import {
  createManualSecretAction,
  deleteManualSecretAction,
  updateManualSecretAction,
} from "@/app/admin/manual/actions";
import { getAdminSession } from "@/lib/admin-auth";
import { getManualCategories, listManualSecretsByCategory } from "@/lib/admin-manual-store";

export const dynamic = "force-dynamic";

type PlatformSection = {
  id: string;
  title: string;
  purpose: string;
  plainEnglish: string;
  links: Array<{ label: string; href: string }>;
  keyTasks: string[];
};

const platformSections: PlatformSection[] = [
  {
    id: "vercel",
    title: "Vercel Hosting and Deployments",
    purpose: "Vercel hosts this website and publishes each new deployment.",
    plainEnglish:
      "Think of Vercel as the company that keeps your website running online 24/7. It handles publishing updates and gives logs when something fails.",
    links: [
      { label: "Vercel Dashboard", href: "https://vercel.com/dashboard" },
      { label: "Project Settings", href: "https://vercel.com/dashboard" },
      { label: "Vercel Documentation", href: "https://vercel.com/docs" },
    ],
    keyTasks: [
      "Check whether the latest deployment is green and healthy.",
      "Review environment variables used by production.",
      "Rollback to a previous deployment if a release causes issues.",
      "Check runtime logs for API or hosting errors.",
    ],
  },
  {
    id: "github",
    title: "GitHub Code and Change History",
    purpose: "GitHub stores the source code, pull requests, branches, and issue history.",
    plainEnglish:
      "Think of GitHub like a time machine for the code. Every change is tracked, reviewed, and can be rolled back.",
    links: [
      { label: "GitHub Repository", href: "https://github.com/Custom-Coding-Creations/Extrasure" },
      { label: "Pull Requests", href: "https://github.com/Custom-Coding-Creations/Extrasure/pulls" },
      { label: "GitHub Documentation", href: "https://docs.github.com" },
    ],
    keyTasks: [
      "Review pull requests before production updates.",
      "Check commit history to understand what changed.",
      "Use branches for testing before merging to main.",
      "Track bugs and requests through Issues.",
    ],
  },
  {
    id: "stripe",
    title: "Stripe Payments and Billing",
    purpose: "Stripe processes customer payments, subscriptions, and refunds.",
    plainEnglish:
      "Think of Stripe as your secure online cashier. It handles card and bank transactions and confirms payment success.",
    links: [
      { label: "Stripe Dashboard", href: "https://dashboard.stripe.com" },
      { label: "Stripe API Keys", href: "https://dashboard.stripe.com/apikeys" },
      { label: "Stripe Webhooks", href: "https://dashboard.stripe.com/webhooks" },
      { label: "Stripe Documentation", href: "https://docs.stripe.com" },
    ],
    keyTasks: [
      "Rotate API keys when staff access changes.",
      "Confirm webhook endpoint status after releases.",
      "Review failed charges and retry workflows.",
      "Issue refunds and verify reconciliation in admin payments.",
    ],
  },
  {
    id: "openai",
    title: "OpenAI Chatbot Services",
    purpose: "OpenAI powers AI conversations used by website assistants and triage flows.",
    plainEnglish:
      "Think of OpenAI as the language engine behind your chatbot. Without a valid key, AI responses fall back or fail.",
    links: [
      { label: "OpenAI Platform", href: "https://platform.openai.com" },
      { label: "API Keys", href: "https://platform.openai.com/api-keys" },
      { label: "Usage Dashboard", href: "https://platform.openai.com/usage" },
      { label: "OpenAI Docs", href: "https://platform.openai.com/docs" },
    ],
    keyTasks: [
      "Verify API key is active and has quota.",
      "Monitor usage costs and token trends.",
      "Confirm configured chat model values are valid.",
      "Disable AI endpoints quickly if behavior is unexpected.",
    ],
  },
  {
    id: "database",
    title: "PostgreSQL Database",
    purpose: "PostgreSQL stores customer records, bookings, jobs, invoices, and audit logs.",
    plainEnglish:
      "Think of PostgreSQL as the master filing cabinet for the business. If it is unavailable, core dashboard data cannot load.",
    links: [
      { label: "Prisma Docs", href: "https://www.prisma.io/docs" },
      { label: "PostgreSQL Docs", href: "https://www.postgresql.org/docs" },
      { label: "Vercel Postgres Docs", href: "https://vercel.com/docs/storage/vercel-postgres" },
    ],
    keyTasks: [
      "Verify database connection health when admin pages fail.",
      "Back up critical data before schema changes.",
      "Run migration and generation commands before deploy.",
      "Monitor query performance on high-traffic workflows.",
    ],
  },
  {
    id: "oauth",
    title: "Google and Microsoft OAuth",
    purpose: "OAuth lets approved admins sign in with Google or Microsoft accounts.",
    plainEnglish:
      "Think of OAuth as secure sign-in by trusted account providers. It reduces password sharing and centralizes login control.",
    links: [
      { label: "Google Cloud Console", href: "https://console.cloud.google.com" },
      { label: "Microsoft Entra", href: "https://entra.microsoft.com" },
      { label: "OAuth Security Guidelines", href: "https://oauth.net/2" },
    ],
    keyTasks: [
      "Maintain approved redirect callback URLs.",
      "Rotate client secrets on schedule.",
      "Remove former employee accounts immediately.",
      "Verify login flow after every auth-related change.",
    ],
  },
];

const categoryAnchorOrder = [
  "vercel",
  "github",
  "stripe",
  "openai",
  "database",
  "oauth",
  "operations",
] as const;

function formatDate(value: Date | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminManualPage() {
  const session = await getAdminSession();
  const secretsByCategory = await listManualSecretsByCategory();
  const categories = getManualCategories();

  return (
    <AdminShell
      title="Operations Manual and Credential Vault"
      subtitle="A complete plain-language guide to how the website is built, hosted, deployed, and managed, including secure credential handling."
    >
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Start Here</h2>
        <p className="mt-3 text-sm text-[#445349]">
          This manual is written for non-technical operators. Use the quick links below, then open each platform section to see what it does,
          why it matters, and which credentials are used.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categoryAnchorOrder.map((category) => (
            <a
              key={category}
              href={`#${category}`}
              className="rounded-full border border-[#35506b] px-3 py-1 text-xs font-semibold text-[#233d5a] transition hover:bg-[#233d5a] hover:text-white"
            >
              {category === "operations" ? "Operations" : category.charAt(0).toUpperCase() + category.slice(1)}
            </a>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-4 text-sm text-[#445349]">
          <p className="font-semibold text-[#20372c]">How this website works in one sentence</p>
          <p className="mt-2">
            GitHub stores the code, Vercel deploys and hosts it, PostgreSQL stores business data, Stripe handles payments, OpenAI powers AI chat,
            and OAuth providers control admin sign-in.
          </p>
        </div>
      </section>

      {platformSections.map((section) => {
        const sectionSecrets = secretsByCategory[section.id as keyof typeof secretsByCategory] ?? [];

        return (
          <section key={section.id} id={section.id} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
            <h2 className="text-2xl text-[#1b2f25]">{section.title}</h2>
            <p className="mt-2 text-sm text-[#2f4338]">{section.purpose}</p>
            <p className="mt-2 text-sm text-[#445349]">{section.plainEnglish}</p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">External Links</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noreferrer" className="text-[#234a70] underline underline-offset-2">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Common Tasks</h3>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                  {section.keyTasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Stored Credentials</h3>
              {sectionSecrets.length === 0 ? (
                <p className="mt-3 text-sm text-[#566c60]">No credentials saved in this section yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {sectionSecrets.map((secret) => (
                    <article key={secret.id} className="rounded-lg border border-[#d3c3a5] bg-[#fff9ed] p-3">
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-semibold text-[#20372c]">{secret.title}</p>
                          <p className="text-xs text-[#5d7267]">Platform: {secret.platform}</p>
                          <p className="text-xs text-[#5d7267]">Username: {secret.username ?? "Not set"}</p>
                          <p className="text-xs text-[#5d7267]">Last rotated: {formatDate(secret.lastRotatedAt)}</p>
                          <p className="text-xs text-[#5d7267]">Last updated: {formatDate(secret.updatedAt)}</p>
                          {secret.portalUrl ? (
                            <a
                              href={secret.portalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs text-[#234a70] underline underline-offset-2"
                            >
                              Open portal
                            </a>
                          ) : null}
                          {secret.notes ? <p className="mt-2 text-xs text-[#445349]">{secret.notes}</p> : null}
                        </div>
                        <ManualSecretRevealButton secretId={secret.id} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}

      <section id="operations" className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Operations and Emergency Guidance</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#445349]">
          <li>If deployments fail, check Vercel deployment logs first.</li>
          <li>If payment links fail, verify Stripe webhook and API key status.</li>
          <li>If admin login fails, verify OAuth provider credentials and callback URLs.</li>
          <li>If admin pages load empty, validate database connectivity and Prisma schema sync.</li>
          <li>After every credential rotation, test login and one live workflow before closing the task.</li>
        </ul>
      </section>

      {session?.role === "owner" ? (
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-2xl text-[#1b2f25]">Credential Vault Management (Owner)</h2>
          <p className="mt-2 text-sm text-[#445349]">
            Add, update, and remove credentials stored for this manual. Password values are encrypted at rest and masked by default.
          </p>

          <form action={createManualSecretAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input name="title" required placeholder="Credential title" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <input name="platform" required placeholder="Platform name" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <select name="category" defaultValue="vercel" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input name="username" placeholder="Username or email" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <input name="portalUrl" placeholder="Portal URL" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <input name="secretValue" required placeholder="Password or secret value" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <input name="notes" placeholder="Notes" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
            <label className="flex items-center gap-2 rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
              <input name="isActive" type="checkbox" className="h-4 w-4" defaultChecked /> Active
            </label>
            <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">
              Add Credential
            </button>
          </form>

          <div className="mt-4 space-y-4">
            {categories.flatMap((category) => secretsByCategory[category]).map((secret) => (
              <article key={secret.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
                <form action={updateManualSecretAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input type="hidden" name="secretId" value={secret.id} />
                  <input name="title" defaultValue={secret.title} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <input name="platform" defaultValue={secret.platform} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <select name="category" defaultValue={secret.category} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                    {categories.map((categoryOption) => (
                      <option key={categoryOption} value={categoryOption}>
                        {categoryOption}
                      </option>
                    ))}
                  </select>
                  <input name="username" defaultValue={secret.username ?? ""} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <input name="portalUrl" defaultValue={secret.portalUrl ?? ""} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <input name="secretValue" placeholder="Leave blank to keep current password" className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <input name="notes" defaultValue={secret.notes ?? ""} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  <label className="flex items-center gap-2 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                    <input name="isActive" type="checkbox" className="h-4 w-4" defaultChecked={secret.isActive} /> Active
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">
                      Save
                    </button>
                  </div>
                </form>
                <form action={deleteManualSecretAction} className="mt-2">
                  <input type="hidden" name="secretId" value={secret.id} />
                  <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">
                    Delete Credential
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
