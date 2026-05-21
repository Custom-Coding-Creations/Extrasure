type DiagramStep = {
  title: string;
  description: string;
};

type DiagramCardProps = {
  title: string;
  subtitle: string;
  steps: DiagramStep[];
};

function DiagramCard({ title, subtitle, steps }: DiagramCardProps) {
  return (
    <article className="rounded-2xl border border-[#d7c9ad] bg-[#fffdf6] p-4">
      <h3 className="text-lg font-semibold text-[#20372c]">{title}</h3>
      <p className="mt-1 text-sm text-[#4f5f56]">{subtitle}</p>
      <div className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <div key={step.title}>
            <div className="rounded-lg border border-[#cdbd9f] bg-[#fff4df] p-3">
              <p className="text-sm font-semibold text-[#2a4136]">{index + 1}. {step.title}</p>
              <p className="mt-1 text-sm text-[#445349]">{step.description}</p>
            </div>
            {index < steps.length - 1 ? (
              <p className="py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7a70]">then next</p>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

export function AdminManualDiagrams() {
  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <h2 className="text-2xl text-[#1b2f25]">Visual Quick Diagrams</h2>
      <p className="mt-2 text-sm text-[#445349]">
        Use these simple flow cards to understand what happens behind the scenes before diving into detailed steps.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <DiagramCard
          title="System Architecture Flow"
          subtitle="How customer actions move through the application"
          steps={[
            {
              title: "Customer or staff action",
              description: "Someone opens a page or submits a form in the website.",
            },
            {
              title: "Next.js app route",
              description: "A server page or API route in src/app receives the request.",
            },
            {
              title: "Business logic in src/lib",
              description: "Rules decide validation, permissions, workflows, and external calls.",
            },
            {
              title: "Database or external platform",
              description: "Data is read or written in PostgreSQL, Stripe, or other services.",
            },
            {
              title: "Response shown to operator",
              description: "The final page or status appears in the dashboard for action.",
            },
          ]}
        />

        <DiagramCard
          title="Deployment Flow"
          subtitle="How code changes become live production behavior"
          steps={[
            {
              title: "Developer opens pull request",
              description: "Changes are reviewed in GitHub before merge.",
            },
            {
              title: "Merge to main",
              description: "Approved changes become the production candidate.",
            },
            {
              title: "Vercel build and deploy",
              description: "Vercel installs dependencies, runs the build, and publishes.",
            },
            {
              title: "Health and log checks",
              description: "Operators verify runtime behavior and review function logs.",
            },
            {
              title: "Rollback if needed",
              description: "If problems appear, revert to the last successful deployment quickly.",
            },
          ]}
        />

        <DiagramCard
          title="Payment and Webhook Flow"
          subtitle="How payment status becomes invoice status"
          steps={[
            {
              title: "Customer payment attempt",
              description: "Customer pays through Stripe checkout or payment element.",
            },
            {
              title: "Stripe confirms event",
              description: "Stripe creates payment events such as success or failure.",
            },
            {
              title: "Webhook reaches app API",
              description: "The app receives signed webhook events and validates them.",
            },
            {
              title: "Internal records update",
              description: "Invoice and payment records are reconciled in the admin system.",
            },
            {
              title: "Operator verifies outcome",
              description: "Payments dashboard and invoice module should now show matching status.",
            },
          ]}
        />
      </div>
    </section>
  );
}