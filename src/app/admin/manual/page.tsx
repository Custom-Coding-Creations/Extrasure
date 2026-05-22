import { AdminShell } from "@/components/admin/admin-shell";
import { AdminManualAssistant } from "@/components/admin/admin-manual-assistant";
import { AdminManualDiagrams } from "@/components/admin/admin-manual-diagrams";
import { ManualGlossaryIndex } from "@/components/admin/manual/manual-glossary-index";
import { ManualSectionFrame } from "@/components/admin/manual/manual-section-frame";
import { ManualTopControls } from "@/components/admin/manual/manual-top-controls";
import { ManualPlatformOperations } from "@/components/admin/manual/manual-platform-operations";
import { ManualRoleWalkthroughs } from "@/components/admin/manual/manual-role-walkthroughs";
import { ManualSecretsByCategoryClient, PlatformSection } from "@/components/admin/manual/manual-types";
import {
  createManualSecretAction,
  deleteManualSecretAction,
  updateManualSecretAction,
} from "@/app/admin/manual/actions";
import { getAdminSession } from "@/lib/admin-auth";
import { getManualCategories, listManualSecretsByCategory } from "@/lib/admin-manual-store";

export const dynamic = "force-dynamic";

type DashboardModuleGuide = {
  title: string;
  href: string;
  whoUsesIt: string;
  whatItControls: string;
  commonTasks: string[];
  mistakesToAvoid: string[];
};

type IncidentGuide = {
  title: string;
  symptom: string;
  firstResponse: string[];
  escalation: string;
};

type RoleWalkthrough = {
  role: string;
  mission: string;
  firstFiveClicks: string[];
  dailyWorkflow: string[];
  emergencyPriority: string[];
};

type DecisionTree = {
  title: string;
  question: string;
  yesPath: string[];
  noPath: string[];
};

const platformSections: PlatformSection[] = [
  {
    id: "vercel",
    category: "vercel",
    title: "Vercel Hosting and Deployments",
    purpose: "Vercel hosts this website and publishes each new deployment.",
    plainEnglish:
      "Think of Vercel as the company that keeps your website running online 24/7. It handles publishing updates and gives logs when something fails.",
    whyItExists:
      "Without Vercel, visitors cannot reach the website and staff cannot access live API routes. It is the top-level runtime for your production app.",
    links: [
      { label: "Vercel Dashboard", href: "https://vercel.com/dashboard" },
      { label: "Project Settings", href: "https://vercel.com/dashboard" },
      { label: "Vercel Documentation", href: "https://vercel.com/docs" },
    ],
    setupChecklist: [
      "Confirm the correct project is connected to the GitHub repository main branch.",
      "Verify production and preview environment variables are present and current.",
      "Confirm domain settings point to the expected production deployment.",
      "Validate build command and install command match project scripts.",
    ],
    dailyChecks: [
      "Review the latest production deployment status.",
      "Check Functions logs for repeated errors.",
      "Confirm no unauthorized environment variable edits were made.",
    ],
    troubleshooting: [
      "If build fails, open deployment logs and identify the first TypeScript or runtime error.",
      "If site is down, check domain routing then rollback to last successful deployment.",
      "If API routes fail only in production, compare production environment variables with local.",
    ],
  },
  {
    id: "github",
    category: "github",
    title: "GitHub Code and Change History",
    purpose: "GitHub stores the source code, pull requests, branches, and issue history.",
    plainEnglish:
      "Think of GitHub like a time machine for the code. Every change is tracked, reviewed, and can be rolled back.",
    whyItExists:
      "GitHub is your system of record for all code and configuration. If a change cannot be traced in GitHub, it should not be trusted in production.",
    links: [
      { label: "GitHub Repository", href: "https://github.com/Custom-Coding-Creations/Extrasure" },
      { label: "Pull Requests", href: "https://github.com/Custom-Coding-Creations/Extrasure/pulls" },
      { label: "GitHub Documentation", href: "https://docs.github.com" },
    ],
    setupChecklist: [
      "Confirm branch protection rules require review before merge to main.",
      "Confirm repository collaborators and role permissions are correct.",
      "Enable security alerts and dependency scanning.",
      "Verify deployment source branch matches Vercel project configuration.",
    ],
    dailyChecks: [
      "Review open pull requests and merge only validated changes.",
      "Check commit history for unexpected direct pushes.",
      "Review issue queue for production-impacting bugs.",
    ],
    troubleshooting: [
      "If production broke after merge, identify the exact merge commit and rollback.",
      "If collaboration fails, verify repository access and branch rules.",
      "If actions/checks fail repeatedly, inspect workflow logs and dependency versions.",
    ],
  },
  {
    id: "stripe",
    category: "stripe",
    title: "Stripe Payments and Billing",
    purpose: "Stripe processes customer payments, subscriptions, and refunds.",
    plainEnglish:
      "Think of Stripe as your secure online cashier. It handles card and bank transactions and confirms payment success.",
    whyItExists:
      "Stripe is the source of truth for payment authorization and settlement. The admin dashboard uses Stripe events to reconcile invoice state.",
    links: [
      { label: "Stripe Dashboard", href: "https://dashboard.stripe.com" },
      { label: "Stripe API Keys", href: "https://dashboard.stripe.com/apikeys" },
      { label: "Stripe Webhooks", href: "https://dashboard.stripe.com/webhooks" },
      { label: "Stripe Documentation", href: "https://docs.stripe.com" },
    ],
    setupChecklist: [
      "Confirm live and test keys are stored in the credential vault with correct labels.",
      "Validate webhook endpoint URL and signing secret in production.",
      "Confirm billing portal settings match customer support policy.",
      "Verify payment methods enabled align with business policy.",
    ],
    dailyChecks: [
      "Review failed payments and retry queue.",
      "Confirm webhook deliveries are successful.",
      "Check for unusual refund or dispute activity.",
    ],
    troubleshooting: [
      "If payment status does not update, check webhook delivery logs first.",
      "If checkout fails, verify publishable key and secret key pair belong to same mode.",
      "If refunds fail, verify role permissions and Stripe account capabilities.",
    ],
  },
  {
    id: "openai",
    category: "openai",
    title: "OpenAI Chatbot Services",
    purpose: "OpenAI powers AI conversations used by website assistants and triage flows.",
    plainEnglish:
      "Think of OpenAI as the language engine behind your chatbot. Without a valid key, AI responses fall back or fail.",
    whyItExists:
      "OpenAI provides the conversational intelligence for customer chat and operator assistance. Availability and key health directly affect AI responses.",
    links: [
      { label: "OpenAI Platform", href: "https://platform.openai.com" },
      { label: "API Keys", href: "https://platform.openai.com/api-keys" },
      { label: "Usage Dashboard", href: "https://platform.openai.com/usage" },
      { label: "OpenAI Docs", href: "https://platform.openai.com/docs" },
    ],
    setupChecklist: [
      "Store production API key in vault and verify environment variable mapping.",
      "Confirm default model names are valid and available.",
      "Set spending alerts and usage monitoring in OpenAI account.",
      "Document emergency fallback behavior when AI endpoint is unavailable.",
    ],
    dailyChecks: [
      "Check usage dashboard for abnormal spikes.",
      "Verify chatbot responses in website and admin workflows.",
      "Review recent AI operation logs for error patterns.",
    ],
    troubleshooting: [
      "If AI returns fallback answers, verify key validity and model settings.",
      "If latency spikes, check status page and recent request volume.",
      "If responses seem unsafe, disable AI temporarily and route to human workflow.",
    ],
  },
  {
    id: "database",
    category: "database",
    title: "PostgreSQL Database",
    purpose: "PostgreSQL stores customer records, bookings, jobs, invoices, and audit logs.",
    plainEnglish:
      "Think of PostgreSQL as the master filing cabinet for the business. If it is unavailable, core dashboard data cannot load.",
    whyItExists:
      "Every operational record is persisted in PostgreSQL. Data quality and uptime here determine whether admin reports and workflows are trustworthy.",
    links: [
      { label: "Prisma Docs", href: "https://www.prisma.io/docs" },
      { label: "PostgreSQL Docs", href: "https://www.postgresql.org/docs" },
      { label: "Vercel Postgres Docs", href: "https://vercel.com/docs/storage/vercel-postgres" },
    ],
    setupChecklist: [
      "Store production database credentials and connection string in vault.",
      "Validate backup and restore process with a test restore.",
      "Confirm Prisma schema and generated client are aligned.",
      "Restrict direct write access to minimum required operators.",
    ],
    dailyChecks: [
      "Confirm admin pages load data without timeout errors.",
      "Review failed DB connection logs.",
      "Check that scheduled cleanup and maintenance scripts are completing.",
    ],
    troubleshooting: [
      "If dashboard data is missing, verify DATABASE_URL and DB reachability.",
      "If schema mismatch appears, run prisma generate and validate db push state.",
      "If data looks stale, verify write paths and webhook ingestion status.",
    ],
  },
  {
    id: "oauth",
    category: "oauth",
    title: "Google and Microsoft OAuth",
    purpose: "OAuth lets approved admins sign in with Google or Microsoft accounts.",
    plainEnglish:
      "Think of OAuth as secure sign-in by trusted account providers. It reduces password sharing and centralizes login control.",
    whyItExists:
      "OAuth simplifies staff authentication and reduces long-lived shared password usage. Correct callback and client secret configuration is critical.",
    links: [
      { label: "Google Cloud Console", href: "https://console.cloud.google.com" },
      { label: "Microsoft Entra", href: "https://entra.microsoft.com" },
      { label: "OAuth Security Guidelines", href: "https://oauth.net/2" },
    ],
    setupChecklist: [
      "Confirm redirect URIs exactly match deployed domain paths.",
      "Store client IDs and client secrets in vault and environment variables.",
      "Limit OAuth app ownership to authorized platform admins.",
      "Test login with both providers after config changes.",
    ],
    dailyChecks: [
      "Monitor failed admin sign-in attempts.",
      "Verify new staff accounts have proper role mapping.",
      "Ensure former staff accounts are removed from provider and dashboard.",
    ],
    troubleshooting: [
      "If OAuth fails, check callback URL mismatch first.",
      "If token exchange fails, rotate client secret and update env values.",
      "If login redirects loop, check session secret and provider app status.",
    ],
  },
];

const dashboardModules: DashboardModuleGuide[] = [
  {
    title: "Overview",
    href: "/admin",
    whoUsesIt: "Owner, dispatch lead",
    whatItControls: "Business KPIs, current workload, and top-level operational health.",
    commonTasks: [
      "Start every morning by checking this page for anomalies.",
      "Review failed payments and unresolved priority tasks.",
      "Use as launch point into other modules.",
    ],
    mistakesToAvoid: [
      "Do not assume green KPIs mean payments webhooks are healthy.",
      "Do not skip reviewing failed items even when totals look normal.",
    ],
  },
  {
    title: "CRM",
    href: "/admin/customers",
    whoUsesIt: "Dispatch, owner, accounting",
    whatItControls: "Customer records, lifecycle status, and contact details.",
    commonTasks: [
      "Search and update customer contact information.",
      "Review lifecycle state before scheduling or invoicing.",
      "Validate payment preferences for billing operations.",
    ],
    mistakesToAvoid: [
      "Do not create duplicate customers when updating existing records.",
      "Do not overwrite phone and email without verifying with customer.",
    ],
  },
  {
    title: "Plans",
    href: "/admin/plans",
    whoUsesIt: "Owner, dispatch, accounting",
    whatItControls: "Service plan catalog and pricing cadence.",
    commonTasks: [
      "Activate or retire service plan offerings.",
      "Review price alignment before campaign updates.",
      "Coordinate with invoicing for billing-cycle changes.",
    ],
    mistakesToAvoid: [
      "Do not deactivate active plans without transition path.",
      "Do not modify recurring pricing without customer notice.",
    ],
  },
  {
    title: "Schedule",
    href: "/admin/schedule",
    whoUsesIt: "Dispatch, owner",
    whatItControls: "Appointment allocation and technician planning.",
    commonTasks: [
      "Assign technicians and update appointment windows.",
      "Handle reschedules and exceptions.",
      "Balance workloads by route and urgency.",
    ],
    mistakesToAvoid: [
      "Do not double-book technicians.",
      "Do not close schedule changes without customer confirmation.",
    ],
  },
  {
    title: "Technicians",
    href: "/admin/technicians",
    whoUsesIt: "Dispatch, owner",
    whatItControls: "Technician roster, status, and assignment readiness.",
    commonTasks: [
      "Update technician availability status.",
      "Resolve duplicate technician profiles.",
      "Review utilization before adding jobs.",
    ],
    mistakesToAvoid: [
      "Do not leave former staff as active technicians.",
      "Do not run dedupe without validating target records.",
    ],
  },
  {
    title: "Estimates",
    href: "/admin/estimates",
    whoUsesIt: "Sales, owner, dispatch",
    whatItControls: "Quote generation, approvals, and conversion to jobs/invoices.",
    commonTasks: [
      "Create and send estimates.",
      "Track approval and decline outcomes.",
      "Convert approved estimates to operational records.",
    ],
    mistakesToAvoid: [
      "Do not convert stale estimates without reconfirming scope.",
      "Do not ignore declined reasons when revising offers.",
    ],
  },
  {
    title: "Invoices",
    href: "/admin/invoices",
    whoUsesIt: "Accounting, owner",
    whatItControls: "Invoice lifecycle, due dates, and payment readiness.",
    commonTasks: [
      "Issue invoices and update billing terms.",
      "Mark and reconcile paid or refunded invoices.",
      "Coordinate with Payments module for failed transactions.",
    ],
    mistakesToAvoid: [
      "Do not edit settled invoices without audit reason.",
      "Do not mark as paid before Stripe confirmation.",
    ],
  },
  {
    title: "Payments",
    href: "/admin/payments",
    whoUsesIt: "Accounting, owner",
    whatItControls: "Stripe payment operations, retries, refunds, and customer payment links.",
    commonTasks: [
      "Retry failed charges.",
      "Issue refunds and confirm status updates.",
      "Generate secure customer payment links.",
    ],
    mistakesToAvoid: [
      "Do not process manual adjustments outside documented workflow.",
      "Do not ignore webhook failures after payment incidents.",
    ],
  },
  {
    title: "Reporting",
    href: "/admin/reporting",
    whoUsesIt: "Owner, accounting",
    whatItControls: "Performance trends, revenue metrics, and planning signals.",
    commonTasks: [
      "Review weekly conversion and retention trends.",
      "Export data for owner review.",
      "Compare service mix performance.",
    ],
    mistakesToAvoid: [
      "Do not use reports without validating underlying date filters.",
      "Do not treat single-day anomalies as long-term trends.",
    ],
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    whoUsesIt: "Operations manager, owner",
    whatItControls: "Supply levels, reorder points, and stock status.",
    commonTasks: [
      "Update quantities after service runs.",
      "Review low-stock alerts.",
      "Plan purchasing before seasonal demand peaks.",
    ],
    mistakesToAvoid: [
      "Do not delay low-stock updates until month end.",
      "Do not change units without retraining team usage.",
    ],
  },
  {
    title: "Automations",
    href: "/admin/automations",
    whoUsesIt: "Owner, operations",
    whatItControls: "Automated reminders, alerts, retries, and triage-triggered actions.",
    commonTasks: [
      "Enable and monitor key automations.",
      "Review failed automation events.",
      "Tune trigger conditions for reliability.",
    ],
    mistakesToAvoid: [
      "Do not enable high-impact automations without staging checks.",
      "Do not ignore failed automation backlog.",
    ],
  },
  {
    title: "Operations Console",
    href: "/admin/chat-operations",
    whoUsesIt: "Owner, dispatch",
    whatItControls: "Admin-only AI-powered scheduling and technician operations with explicit confirmation safeguards.",
    commonTasks: [
      "Review appointments and technicians before making schedule changes.",
      "Run schedule, reschedule, cancel, and assignment actions with confirmation.",
      "Capture operation outcome details for support follow-up.",
    ],
    mistakesToAvoid: [
      "Do not confirm write actions until customer details and timing are verified.",
      "Do not use this module from shared or unattended sessions.",
    ],
  },
  {
    title: "Operations History",
    href: "/admin/chat-operations/history",
    whoUsesIt: "Owner, dispatch",
    whatItControls: "Audit-aligned operation history including status, actor context, and detailed payload/result snapshots.",
    commonTasks: [
      "Filter operation outcomes by success, errors, and confirmation-required states.",
      "Review details to diagnose failed operations quickly.",
      "Use owner team scope view when coordinating incident investigations.",
    ],
    mistakesToAvoid: [
      "Do not ignore repeated denied or failed actions without root-cause review.",
      "Do not rely on memory when audit-backed history is available.",
    ],
  },
  {
    title: "Security Settings",
    href: "/admin/settings",
    whoUsesIt: "Owner",
    whatItControls: "Admin users, role assignments, MFA readiness, and operational security controls.",
    commonTasks: [
      "Create and maintain admin accounts.",
      "Adjust role access when staffing changes.",
      "Audit and rotate privileged credentials.",
    ],
    mistakesToAvoid: [
      "Do not remove the final owner account.",
      "Do not grant owner role without business approval.",
    ],
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    whoUsesIt: "Owner",
    whatItControls: "Immutable action history for critical changes and investigations.",
    commonTasks: [
      "Review who changed what and when.",
      "Investigate payment and account incidents.",
      "Confirm credential access events are expected.",
    ],
    mistakesToAvoid: [
      "Do not ignore unusual after-hours high-risk actions.",
      "Do not perform sensitive changes without expected audit trail.",
    ],
  },
];

const incidentGuides: IncidentGuide[] = [
  {
    title: "Website is down",
    symptom: "Visitors cannot load the site or receive server errors.",
    firstResponse: [
      "Open Vercel dashboard and check latest production deployment status.",
      "If latest deployment failed health checks, rollback to previous successful deployment.",
      "Check runtime logs for first fatal error and document timestamp.",
    ],
    escalation: "Escalate to developer after rollback and log capture if outage exceeds 15 minutes.",
  },
  {
    title: "Payments are not updating",
    symptom: "Invoices remain open after customer pays.",
    firstResponse: [
      "Check Stripe webhook deliveries for failures.",
      "Verify STRIPE_WEBHOOK_SECRET and endpoint URL in production settings.",
      "Confirm payment exists in Stripe dashboard and compare event timestamps.",
    ],
    escalation: "Escalate if webhook replay does not reconcile within 10 minutes.",
  },
  {
    title: "Admin cannot sign in",
    symptom: "Owner login or OAuth flow fails or loops.",
    firstResponse: [
      "Validate admin auth secrets and OAuth callback URLs.",
      "Confirm provider app status in Google and Microsoft consoles.",
      "Try owner credential login flow to isolate OAuth-specific failure.",
    ],
    escalation: "Escalate if all auth methods fail or multiple users are locked out.",
  },
  {
    title: "Dashboard data missing",
    symptom: "Pages render but records are empty or stale.",
    firstResponse: [
      "Validate database connectivity and schema sync state.",
      "Check recent deploy logs for Prisma generation or query errors.",
      "Confirm webhook ingestion endpoints are healthy for external data updates.",
    ],
    escalation: "Escalate if data remains stale after DB and webhook checks.",
  },
];

const roleWalkthroughs: RoleWalkthrough[] = [
  {
    role: "Owner",
    mission: "Keep operations healthy, secure, and financially stable.",
    firstFiveClicks: [
      "Open Admin Manual and review the First 30 Minutes checklist.",
      "Open Overview and scan KPI anomalies.",
      "Open Payments and check failed charges and refunds.",
      "Open Security settings and confirm admin user access is current.",
      "Open Audit Logs and review sensitive actions from the last 24 hours.",
    ],
    dailyWorkflow: [
      "Review Reporting for business trend shifts.",
      "Approve or escalate unusual operational events.",
      "Validate platform status pages if any module is unstable.",
      "Confirm one backup and recovery control each day.",
    ],
    emergencyPriority: [
      "Stabilize service (rollback, disable risky workflows).",
      "Protect cash flow (payments, invoicing, webhook health).",
      "Protect access (admin auth and credential controls).",
    ],
  },
  {
    role: "Dispatch",
    mission: "Keep customer appointments and technician operations moving smoothly.",
    firstFiveClicks: [
      "Open Overview for immediate alerts.",
      "Open Schedule to confirm today and tomorrow assignments.",
      "Open Technicians to verify availability states.",
      "Open CRM for customer detail corrections.",
      "Open Automations to check failed reminders or notifications.",
    ],
    dailyWorkflow: [
      "Resolve schedule conflicts and customer reschedules quickly.",
      "Update technician statuses to avoid assignment drift.",
      "Coordinate with accounting if payment status blocks service.",
      "Escalate critical customer-impact incidents within 15 minutes.",
    ],
    emergencyPriority: [
      "Keep schedule continuity using manual fallback communication.",
      "Prevent double-booking and technician idle time.",
      "Document all temporary manual overrides.",
    ],
  },
  {
    role: "Accounting",
    mission: "Protect payment integrity, invoice accuracy, and financial traceability.",
    firstFiveClicks: [
      "Open Payments and review failed/pending transactions.",
      "Open Invoices and confirm current open/past-due list.",
      "Open Reporting for payment trend anomalies.",
      "Open Stripe section in Admin Manual for webhook/API checks.",
      "Open Audit Logs for refund/retry/admin financial actions.",
    ],
    dailyWorkflow: [
      "Reconcile payment status against invoice status.",
      "Retry failed charges and log outcomes.",
      "Escalate unresolved payment sync issues rapidly.",
      "Verify credential access for financial tools is still least-privilege.",
    ],
    emergencyPriority: [
      "Restore payment processing path first.",
      "Prevent incorrect duplicate charges/refunds.",
      "Maintain full auditability for all financial edits.",
    ],
  },
];

const emergencyDecisionTrees: DecisionTree[] = [
  {
    title: "Site Outage Decision Tree",
    question: "Can customers access the website right now?",
    yesPath: [
      "Go to admin pages and check whether only internal modules are failing.",
      "If only internal failures exist, jump to Database or Auth decision trees.",
      "Log incident as degraded service and continue monitoring every 5 minutes.",
    ],
    noPath: [
      "Open Vercel deployment status and logs immediately.",
      "If newest deployment is failing, rollback to last successful deployment.",
      "If rollback fails, escalate to developer and declare incident in operations channel.",
    ],
  },
  {
    title: "Payment Failure Decision Tree",
    question: "Are successful Stripe charges failing to update invoices?",
    yesPath: [
      "Check Stripe webhook deliveries for failed events.",
      "Validate webhook secret and endpoint URL in environment settings.",
      "Replay failed webhook events and confirm invoice reconciliation.",
    ],
    noPath: [
      "Check whether charge itself is failing in Stripe checkout flow.",
      "Validate publishable/secret key pair and mode alignment (test vs live).",
      "If customer impact is broad, temporarily switch to manual payment support process.",
    ],
  },
  {
    title: "Admin Login Failure Decision Tree",
    question: "Can any admin log in through any method?",
    yesPath: [
      "Scope issue to affected user/provider only.",
      "Check OAuth callback URLs and provider account assignments.",
      "Reset or rotate user credentials and re-test.",
    ],
    noPath: [
      "Verify auth secrets and environment variable presence.",
      "Check OAuth provider service health pages.",
      "Escalate as P1 security/access incident and apply emergency access protocol.",
    ],
  },
];

const glossaryItems = [
  {
    term: "Deployment",
    definition: "A newly published version of the website.",
    detail: "Use this term when discussing a build that has been promoted to production or preview.",
    category: "Operations",
  },
  {
    term: "Webhook",
    definition: "An automatic event message from one system to another.",
    detail: "Stripe and other services use webhooks so the app can react to payment and status changes.",
    category: "Integrations",
  },
  {
    term: "API key",
    definition: "A secret passcode software uses to access an external service.",
    detail: "Keep keys in the credential vault and never paste them into public logs or chat.",
    category: "Credentials",
  },
  {
    term: "Environment variable",
    definition: "A hidden configuration value used at runtime.",
    detail: "These values differ between local, preview, and production deployments.",
    category: "Configuration",
  },
  {
    term: "Prisma",
    definition: "The tool this project uses to define and query database data.",
    detail: "Schema changes require generation and validation before production deployment.",
    category: "Database",
  },
  {
    term: "Schema",
    definition: "The structure of database tables and fields.",
    detail: "Schema drift can cause runtime errors or missing data in admin pages.",
    category: "Database",
  },
  {
    term: "OAuth",
    definition: "Sign-in using trusted accounts like Google or Microsoft.",
    detail: "If redirect URLs or client secrets are wrong, admin sign-in can loop or fail.",
    category: "Security",
  },
  {
    term: "Rollback",
    definition: "Switching back to a previously working deployment.",
    detail: "Use rollback when a new deployment is actively causing customer-facing failures.",
    category: "Recovery",
  },
];

const manualNavSections = [
  { id: "quick-start", label: "Quick Start", tags: ["crisis", "assistant", "diagrams"] },
  { id: "operating-guides", label: "Operating Guides", tags: ["roles", "architecture", "sop"] },
  { id: "admin-modules", label: "Dashboard Modules", tags: ["crm", "payments", "schedule"] },
  { id: "platform-ops", label: "Platform Operations", tags: ["vercel", "github", "stripe", "oauth", "openai"] },
  { id: "incidents", label: "Incidents and Recovery", tags: ["outage", "playbooks", "decision tree"] },
  { id: "reference-security", label: "Reference and Security", tags: ["glossary", "credentials", "vault"] },
];

export default async function AdminManualPage() {
  const session = await getAdminSession();
  const secretsByCategory = await listManualSecretsByCategory();
  const categories = getManualCategories();
  const platformSecretsForClient = categories.reduce<ManualSecretsByCategoryClient>((accumulator, category) => {
    accumulator[category] = secretsByCategory[category].map((secret) => ({
      id: secret.id,
      title: secret.title,
      platform: secret.platform,
      category: secret.category,
      portalUrl: secret.portalUrl,
      username: secret.username,
      notes: secret.notes,
      isActive: secret.isActive,
      lastRotatedAt: secret.lastRotatedAt ? secret.lastRotatedAt.toISOString() : null,
      updatedAt: secret.updatedAt.toISOString(),
    }));
    return accumulator;
  }, {});
  const navSections =
    session?.role === "owner"
      ? [...manualNavSections, { id: "owner-credentials", label: "Owner Credentials", tags: ["vault", "secrets", "owner"] }]
      : manualNavSections;

  return (
    <AdminShell
      title="Operations Manual and Credential Vault"
      subtitle="A complete plain-language guide to how the website is built, hosted, deployed, and managed, including secure credential handling."
    >
      <ManualTopControls sections={navSections} />

      <section aria-label="Operations assistant" className="mt-5 mb-6">
        <AdminManualAssistant />
      </section>

      <ManualSectionFrame
        id="quick-start"
        eyebrow="Orientation"
        title="Executive Start Here"
        defaultOpen={false}
        summary="Start with the emergency checklist, then use the visual flows and assistant for fast orientation."
        stats={["Crisis first", "3 references", "2 visual guides"]}
        description="Start with crisis response, then use visual flows and assistant support to orient quickly."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <details className="rounded-xl border border-[#b65d36] bg-[#fff1e8]">
            <summary className="list-none cursor-pointer px-4 py-3">
              <p className="text-base font-semibold text-[#7a2f10]">First 30 Minutes</p>
              <p className="mt-1 text-sm text-[#6b3a22]">The minimum crisis sequence before anything else.</p>
            </summary>
            <div className="border-t border-[#e4c4ad] px-4 py-3">
              <ol className="list-inside list-decimal space-y-1 text-sm text-[#6b3a22]">
                <li>Confirm site and payment availability.</li>
                <li>Open Vercel, Stripe, and admin logs.</li>
                <li>Rollback if deploy-related.</li>
                <li>Assign incident lead and communications owner.</li>
                <li>Use decision trees instead of ad-hoc troubleshooting.</li>
                <li>Document the sequence with operator and time.</li>
              </ol>
            </div>
          </details>
          <details className="rounded-xl border border-[#deceb0] bg-[#fff4df]">
            <summary className="list-none cursor-pointer px-4 py-3">
              <p className="text-base font-semibold text-[#20372c]">System Map</p>
              <p className="mt-1 text-sm text-[#445349]">The shortest possible summary of the stack.</p>
            </summary>
            <div className="border-t border-[#e4d4b5] px-4 py-3 text-sm text-[#445349]">
              GitHub stores code, Vercel deploys it, PostgreSQL stores data, Stripe handles payments, OpenAI powers AI chat, and OAuth controls admin sign-in.
            </div>
          </details>
          <details className="rounded-xl border border-[#deceb0] bg-[#fff4df]">
            <summary className="list-none cursor-pointer px-4 py-3">
              <p className="text-base font-semibold text-[#20372c]">New Operator</p>
              <p className="mt-1 text-sm text-[#445349]">Open these areas first to avoid getting lost.</p>
            </summary>
            <div className="border-t border-[#e4d4b5] px-4 py-3">
              <ol className="list-inside list-decimal space-y-1 text-sm text-[#445349]">
                <li>Review Dashboard Modules.</li>
                <li>Open Platform Operations.</li>
                <li>Use Daily SOP checklists.</li>
                <li>Read Incident Playbooks.</li>
              </ol>
            </div>
          </details>
        </div>
        <details className="mt-4 rounded-2xl border border-[#d6c8a4] bg-[#fff9eb]" open={false}>
          <summary className="list-none cursor-pointer px-4 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#566b60]">Visual Quick Diagrams</p>
            <p className="mt-1 text-sm text-[#445349]">Open only if you want the fuller process maps.</p>
          </summary>
          <div className="border-t border-[#d6c8a4] p-4">
            <AdminManualDiagrams />
          </div>
        </details>
      </ManualSectionFrame>

      <ManualSectionFrame
        id="operating-guides"
        eyebrow="Operations"
        title="Role Guides and Core Operating Patterns"
        summary="Daily, weekly, and monthly routines for owners, dispatch, and accounting."
        stats={["3 roles", "3 routines", "1 architecture map"]}
        description="Follow these role-specific flows, architecture cues, and recurring routines to run operations consistently."
        defaultOpen={false}
      >
        <div className="space-y-4">
          <ManualRoleWalkthroughs walkthroughs={roleWalkthroughs} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">System Architecture and Data Flow</h3>
              <p className="mt-2 text-sm text-[#445349]">This section explains how requests move through the system from customer action to business outcome.</p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Next.js app with server and client routes.</li>
                <li>Prisma ORM for database access and schema management.</li>
                <li>PostgreSQL for persistent business data.</li>
                <li>Stripe for payment collection, subscriptions, and refund operations.</li>
                <li>OpenAI APIs for chatbot and AI-supported workflows.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Deployment and Hosting Path</h3>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-[#445349]">
                <li>Code is merged to GitHub main.</li>
                <li>Vercel pulls repository and runs production build.</li>
                <li>Prisma client is generated and schema is synced for production.</li>
                <li>Deployment is promoted and traffic is served from Vercel edge/runtime.</li>
                <li>Payments, auth providers, and AI services are consumed via secured environment variables.</li>
              </ol>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Daily</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Check Overview page for failures and unusual spikes.</li>
                <li>Review Payments for failed charges and webhook issues.</li>
                <li>Confirm Schedule and Technician status is current.</li>
                <li>Verify any urgent automation failures are resolved.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Weekly</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Review Reporting trends and investigate anomalies.</li>
                <li>Audit user access and remove stale admin accounts.</li>
                <li>Review audit logs for sensitive actions and credential access events.</li>
                <li>Validate backup readiness and platform health links.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Monthly</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Rotate high-privilege credentials and document completion.</li>
                <li>Reconfirm OAuth app settings and redirect URLs.</li>
                <li>Review Stripe risk events, disputes, and refund policy adherence.</li>
                <li>Run emergency response drill using incident playbooks.</li>
              </ul>
            </div>
          </div>
        </div>
      </ManualSectionFrame>

      <ManualSectionFrame
        id="admin-modules"
        eyebrow="Execution"
        title="Admin Dashboard Module Manual"
        summary="Compact module summaries for CRM, billing, scheduling, inventory, automation, and reporting."
        stats={["13 modules", "2 actions each", "Reference + workflow"]}
        description="Each module summary explains who uses it, what it controls, and safe execution patterns."
        defaultOpen={false}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {dashboardModules.map((module) => (
            <article key={module.href} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#20372c]">{module.title}</h3>
                <a href={module.href} className="text-sm font-semibold text-[#234a70] underline underline-offset-2">
                  Open Module
                </a>
              </div>
              <p className="mt-2 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Who uses it:</span> {module.whoUsesIt}</p>
              <p className="mt-1 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">What it controls:</span> {module.whatItControls}</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Common tasks</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {module.commonTasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Mistakes to avoid</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {module.mistakesToAvoid.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </ManualSectionFrame>

      <ManualSectionFrame
        id="platform-ops"
        eyebrow="Platforms"
        title="Platform Operations"
        summary="One platform at a time for setup, checks, troubleshooting, and credentials."
        stats={["6 systems", "Tabbed view", "Credential-aware"]}
        description="Focus on one platform at a time with tabbed views for setup, checks, troubleshooting, and credentials."
        defaultOpen={false}
      >
        <ManualPlatformOperations sections={platformSections} secretsByCategory={platformSecretsForClient} />
      </ManualSectionFrame>

      <ManualSectionFrame
        id="incidents"
        eyebrow="Recovery"
        title="Incident Playbooks and Escalation"
        summary="Fast response guides for outages, payment sync issues, login failures, and missing data."
        stats={["4 playbooks", "3 decision trees", "P1 ready"]}
        description="Use these guided response paths to stabilize service quickly and reduce improvisation during outages."
        defaultOpen={false}
      >
        <div className="space-y-4">
          {incidentGuides.map((guide) => (
            <article key={guide.title} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-lg font-semibold text-[#20372c]">{guide.title}</h3>
              <p className="mt-2 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Symptom:</span> {guide.symptom}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">First response steps</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#445349]">
                {guide.firstResponse.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Escalation:</span> {guide.escalation}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
          <h3 className="text-base font-semibold text-[#20372c]">Emergency Decision Trees</h3>
          <p className="mt-1 text-sm text-[#445349]">Use these yes/no paths when time is limited and multiple systems may be failing.</p>
          <div className="mt-4 space-y-4">
            {emergencyDecisionTrees.map((tree) => (
              <article key={tree.title} className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed] p-3">
                <h4 className="font-semibold text-[#20372c]">{tree.title}</h4>
                <p className="mt-1 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Question:</span> {tree.question}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#95b692] bg-[#f2f9f1] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2e5c2b]">If yes</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#355933]">
                      {tree.yesPath.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="rounded-lg border border-[#d0a48c] bg-[#fff3ec] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a3f20]">If no</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#7c3f24]">
                      {tree.noPath.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ManualSectionFrame>

      <ManualSectionFrame
        id="reference-security"
        eyebrow="Reference"
        title="Glossary and Credential Security"
        summary="Searchable definitions plus rules for handling sensitive access safely."
        stats={["Reference index", "Security rules", "Vault standards"]}
        description="Use these standards to keep account access consistent, auditable, and operationally safe."
        defaultOpen={false}
      >
        <div className="space-y-4">
          <ManualGlossaryIndex items={glossaryItems} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">What each entry should include</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Title that clearly identifies account purpose.</li>
                <li>Platform name and portal URL.</li>
                <li>Username or account email.</li>
                <li>Password or secret value.</li>
                <li>Notes for MFA process, recovery instructions, or owner contact.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Security operating rules</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Use reveal and copy only when actively performing a task.</li>
                <li>Rotate credentials after staff changes or suspected compromise.</li>
                <li>Verify successful login after every rotation event.</li>
                <li>Review audit logs for manual_secret_viewed events each week.</li>
              </ul>
            </div>
          </div>
        </div>
      </ManualSectionFrame>

      {session?.role === "owner" ? (
        <ManualSectionFrame
          id="owner-credentials"
          eyebrow="Owner Only"
          title="Credential Vault Management"
          summary="Create, update, and remove encrypted credentials in a controlled owner-only vault."
          stats={["Owner only", "Encrypted at rest", "Audit logged"]}
          description="Add, update, and remove encrypted credentials used across external platforms."
          defaultOpen={false}
        >
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h2 className="text-2xl text-[#1b2f25]">Credential Vault Management (Owner)</h2>
              <p className="mt-2 max-w-3xl text-sm text-[#445349]">
                Add, update, and remove credentials stored for this manual. Password values are encrypted at rest and masked by default.
              </p>
            </div>

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

          <div className="mt-4 space-y-3">
            {categories.map((category) => {
              const entries = secretsByCategory[category];

              return (
                <details key={category} className="rounded-xl border border-[#d8caad] bg-[#fff4df]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                    <span className="text-sm font-semibold capitalize text-[#20372c]">{category}</span>
                    <span className="rounded-full border border-[#35506b] bg-[#fff9ed] px-2 py-0.5 text-[0.7rem] font-semibold text-[#233d5a]">
                      {entries.length} stored
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-[#d8caad] p-4">
                    {entries.length === 0 ? (
                      <p className="text-sm text-[#566c60]">No credentials stored in this category.</p>
                    ) : (
                      entries.map((secret) => (
                        <details key={secret.id} className="rounded-xl border border-[#deceb0] bg-[#fff9ed]" open={false}>
                          <summary className="list-none cursor-pointer px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#20372c]">{secret.title}</p>
                                <p className="mt-1 text-xs text-[#5d7267]">{secret.platform} · {secret.username ?? "No username"} · Updated {formatDate(secret.updatedAt)}</p>
                              </div>
                              <span className="rounded-full border border-[#35506b] bg-[#fff9ed] px-2.5 py-1 text-[0.68rem] font-semibold text-[#233d5a]">
                                {secret.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </summary>
                          <div className="border-t border-[#d8caad] p-4">
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
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </ManualSectionFrame>
      ) : null}
    </AdminShell>
  );
}
