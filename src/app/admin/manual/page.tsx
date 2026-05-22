import { AdminShell } from "@/components/admin/admin-shell";
import { AdminManualAssistant } from "@/components/admin/admin-manual-assistant";
import { AdminManualAssistantMetrics } from "@/components/admin/admin-manual-assistant-metrics";
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
  severity: "P1" | "P2" | "P3";
  symptom: string;
  detectionSignals: string[];
  firstResponse: string[];
  containmentChecklist: string[];
  diagnostics: string[];
  serviceRecovery: string[];
  escalationPacket: string[];
  linkedSections: string[];
  escalation: string;
};

type RoleWalkthrough = {
  role: string;
  mission: string;
  firstFiveClicks: string[];
  startOfDayChecks: string[];
  dailyWorkflow: string[];
  endOfDayChecks: string[];
  handoffProtocol: string[];
  highRiskMistakes: string[];
  emergencyPriority: string[];
};

type DecisionTree = {
  title: string;
  question: string;
  yesPath: string[];
  noPath: string[];
  ifUnknownPath: string[];
};

function formatDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
    weeklyChecks: [
      "Verify rollback candidate deployments are still healthy and accessible.",
      "Audit project members and deployment permissions for least privilege.",
      "Review build duration trend for sudden regressions.",
    ],
    failureSignals: [
      "Consecutive deployment failures with same compile/runtime signature.",
      "Spike in function timeouts or memory errors.",
      "Domain SSL warnings or intermittent routing failures.",
    ],
    troubleshooting: [
      "If build fails, open deployment logs and identify the first TypeScript or runtime error.",
      "If site is down, check domain routing then rollback to last successful deployment.",
      "If API routes fail only in production, compare production environment variables with local.",
    ],
    recoveryRunbook: [
      "Stabilize by rolling back to last known good deployment.",
      "Run smoke test for homepage, booking, admin login, and payment entry.",
      "Reintroduce latest changes only after root cause is isolated and fixed.",
    ],
    verificationChecklist: [
      "No active Vercel incidents and deployment status is ready.",
      "Zero critical function errors for 10 minutes.",
      "Core user paths return expected status codes.",
    ],
    escalationThresholds: [
      "Customer-facing outage exceeds 15 minutes.",
      "Rollback fails or introduces secondary failures.",
      "Two consecutive deploys fail with unknown cause.",
    ],
    relatedSections: [
      { label: "Incidents and Recovery", anchorId: "incidents" },
      { label: "Executive Start Here", anchorId: "quick-start" },
    ],
    lastReviewed: "May 2026",
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
    weeklyChecks: [
      "Review branch protection settings and required status checks.",
      "Confirm inactive collaborators are removed.",
      "Audit dependency/security alerts and assign owners.",
    ],
    failureSignals: [
      "Unreviewed direct commits to protected branch.",
      "Repeated CI failures on release-critical paths.",
      "Large unscoped PRs merged without rollout notes.",
    ],
    troubleshooting: [
      "If production broke after merge, identify the exact merge commit and rollback.",
      "If collaboration fails, verify repository access and branch rules.",
      "If actions/checks fail repeatedly, inspect workflow logs and dependency versions.",
    ],
    recoveryRunbook: [
      "Revert or hotfix the offending merge commit.",
      "Re-run validation and required checks before re-promoting.",
      "Update incident notes with commit IDs and impacted files.",
    ],
    verificationChecklist: [
      "Main branch reflects intended recovery commit.",
      "Required checks are green on recovery PR.",
      "Release notes include operational impact summary.",
    ],
    escalationThresholds: [
      "Main branch integrity uncertain after multiple rapid fixes.",
      "Security alert impacts production dependency chain.",
      "Ownership/permission drift cannot be resolved immediately.",
    ],
    relatedSections: [
      { label: "Admin Dashboard Module Manual", anchorId: "admin-modules" },
      { label: "Incidents and Recovery", anchorId: "incidents" },
    ],
    lastReviewed: "May 2026",
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
    weeklyChecks: [
      "Reconcile invoice and charge parity for random sampled accounts.",
      "Review fraud/dispute indicators and adjust risk playbook.",
      "Validate backup payment methods and customer portal settings.",
    ],
    failureSignals: [
      "Payment successes in Stripe without invoice updates.",
      "Webhook delivery failure ratio spikes above baseline.",
      "Retry queue growth over multiple cycles.",
    ],
    troubleshooting: [
      "If payment status does not update, check webhook delivery logs first.",
      "If checkout fails, verify publishable key and secret key pair belong to same mode.",
      "If refunds fail, verify role permissions and Stripe account capabilities.",
    ],
    recoveryRunbook: [
      "Replay failed webhook events in chronological order.",
      "Manually reconcile oldest impacted invoices first.",
      "Resume automated retries only after reconciliation lag stabilizes.",
    ],
    verificationChecklist: [
      "Webhook delivery errors return to normal levels.",
      "Sampled paid invoices show correct settled states.",
      "No duplicate retry or refund side effects observed.",
    ],
    escalationThresholds: [
      "Payment sync lag exceeds 10 minutes across active customers.",
      "Refund operations fail for multiple independent cases.",
      "Potential duplicate charge risk is detected.",
    ],
    relatedSections: [
      { label: "Incidents and Recovery", anchorId: "incidents" },
      { label: "Glossary and Credential Security", anchorId: "reference-security" },
    ],
    lastReviewed: "May 2026",
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
    weeklyChecks: [
      "Review model/version configuration for drift across environments.",
      "Assess fallback usage ratio and tune escalation criteria.",
      "Audit prompt/policy changes with owner signoff.",
    ],
    failureSignals: [
      "Fallback responses increase suddenly without deploy changes.",
      "Latency spikes cause user-visible timeout complaints.",
      "Safety/policy exceptions rise in chat moderation logs.",
    ],
    troubleshooting: [
      "If AI returns fallback answers, verify key validity and model settings.",
      "If latency spikes, check status page and recent request volume.",
      "If responses seem unsafe, disable AI temporarily and route to human workflow.",
    ],
    recoveryRunbook: [
      "Switch to deterministic fallback mode for critical user paths.",
      "Validate API key and model availability with direct health request.",
      "Re-enable AI progressively and monitor error/latency trends.",
    ],
    verificationChecklist: [
      "Chat and triage APIs return expected non-fallback responses.",
      "Latency is within acceptable operating target.",
      "No policy-critical output issues observed in spot checks.",
    ],
    escalationThresholds: [
      "Fallback mode persists beyond 30 minutes.",
      "Unsafe output is observed in production workflows.",
      "OpenAI outage has sustained customer impact.",
    ],
    relatedSections: [
      { label: "Role Guides and Core Operating Patterns", anchorId: "operating-guides" },
      { label: "Incidents and Recovery", anchorId: "incidents" },
    ],
    lastReviewed: "May 2026",
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
    weeklyChecks: [
      "Run schema drift check between deployed schema and expected migration state.",
      "Validate backup restore point freshness and recovery test evidence.",
      "Review slow queries and add remediation tasks for regressions.",
    ],
    failureSignals: [
      "Sudden increase in query timeout errors.",
      "Data freshness mismatch across related modules.",
      "Unexpected null/empty record spikes in critical entities.",
    ],
    troubleshooting: [
      "If dashboard data is missing, verify DATABASE_URL and DB reachability.",
      "If schema mismatch appears, run prisma generate and validate db push state.",
      "If data looks stale, verify write paths and webhook ingestion status.",
    ],
    recoveryRunbook: [
      "Restore connectivity and schema alignment before retrying write-heavy workflows.",
      "Backfill missed ingestion events if applicable.",
      "Confirm core module record counts match expected trend baselines.",
    ],
    verificationChecklist: [
      "No active connection saturation or timeout errors.",
      "Schema/client generation status is healthy.",
      "High-priority modules show fresh and consistent data.",
    ],
    escalationThresholds: [
      "Core admin modules cannot load data for over 10 minutes.",
      "Potential data integrity risk is identified.",
      "Backup/restore readiness cannot be verified.",
    ],
    relatedSections: [
      { label: "Admin Dashboard Module Manual", anchorId: "admin-modules" },
      { label: "Incidents and Recovery", anchorId: "incidents" },
    ],
    lastReviewed: "May 2026",
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
    weeklyChecks: [
      "Audit provider app redirect URIs for drift across environments.",
      "Review admin role assignments against least-privilege standards.",
      "Test emergency owner-login fallback path.",
    ],
    failureSignals: [
      "Redirect-loop login reports from multiple admins.",
      "OAuth callback mismatch errors in auth logs.",
      "Repeated denied access for valid users after role changes.",
    ],
    troubleshooting: [
      "If OAuth fails, check callback URL mismatch first.",
      "If token exchange fails, rotate client secret and update env values.",
      "If login redirects loop, check session secret and provider app status.",
    ],
    recoveryRunbook: [
      "Restore callback URLs and client secret configuration.",
      "Validate owner and dispatch login with both provider and manual fallback.",
      "Review audit logs for unexpected auth changes during incident window.",
    ],
    verificationChecklist: [
      "Successful login for at least one account per supported auth method.",
      "Stable session behavior without loops.",
      "Role resolution matches expected dashboard permissions.",
    ],
    escalationThresholds: [
      "No admins can log in through any method.",
      "Auth failures affect owner emergency access paths.",
      "Potential unauthorized access pattern is detected.",
    ],
    relatedSections: [
      { label: "Glossary and Credential Security", anchorId: "reference-security" },
      { label: "Incidents and Recovery", anchorId: "incidents" },
    ],
    lastReviewed: "May 2026",
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
    severity: "P1",
    symptom: "Visitors cannot load the site or receive server errors.",
    detectionSignals: [
      "Home page fails from external network with 5xx or timeout.",
      "Synthetic monitoring or admin reports sudden traffic drop.",
      "Multiple operator reports confirm outage across devices.",
    ],
    firstResponse: [
      "Open Vercel dashboard and check latest production deployment status.",
      "If latest deployment failed health checks, rollback to previous successful deployment.",
      "Check runtime logs for first fatal error and document timestamp.",
    ],
    containmentChecklist: [
      "Pause non-essential releases until root cause is identified.",
      "Switch customer-facing comms banner or support script to incident mode.",
      "Route urgent bookings through dispatch fallback workflow while web flow is unstable.",
    ],
    diagnostics: [
      "Confirm whether outage affects only public pages or admin routes too.",
      "Compare failing endpoints to recent deployment diff and changed env values.",
      "Capture request IDs and first failing timestamp for incident timeline.",
    ],
    serviceRecovery: [
      "Validate homepage, booking flow, and payment entry path after rollback/fix.",
      "Run a smoke test across at least one customer flow and one admin flow.",
      "Announce service restored only after 10 minutes of stable monitoring.",
    ],
    escalationPacket: [
      "Incident start time and first detection source.",
      "Latest successful deployment ID and active rollback target.",
      "Top error signatures and affected routes.",
      "Operator actions already attempted and outcomes.",
    ],
    linkedSections: ["quick-start", "platform-ops", "incidents"],
    escalation: "Escalate to developer after rollback and log capture if outage exceeds 15 minutes.",
  },
  {
    title: "Payments are not updating",
    severity: "P1",
    symptom: "Invoices remain open after customer pays.",
    detectionSignals: [
      "Stripe dashboard shows successful charge but invoice status remains open.",
      "Support reports duplicate payment follow-up requests.",
      "Webhook delivery failures spike for payment-intent events.",
    ],
    firstResponse: [
      "Check Stripe webhook deliveries for failures.",
      "Verify STRIPE_WEBHOOK_SECRET and endpoint URL in production settings.",
      "Confirm payment exists in Stripe dashboard and compare event timestamps.",
    ],
    containmentChecklist: [
      "Pause automated dunning actions that may confuse already-paid customers.",
      "Flag impacted invoices for manual review queue.",
      "Coordinate with dispatch to avoid service holds due to stale billing state.",
    ],
    diagnostics: [
      "Reconcile one known-good charge end-to-end from Stripe event to invoice update.",
      "Identify whether failures are event-type specific or endpoint-wide.",
      "Check recent deploy/config changes around payment reconciliation logic.",
    ],
    serviceRecovery: [
      "Replay failed webhook events in controlled batches.",
      "Verify invoice state corrections in admin payments and invoices modules.",
      "Resume normal automation only after reconciliation lag is back to baseline.",
    ],
    escalationPacket: [
      "Affected invoice count and oldest unresolved payment timestamp.",
      "Webhook error samples with event IDs.",
      "Current Stripe endpoint and secret version in use.",
      "Manual reconciliation actions completed.",
    ],
    linkedSections: ["platform-ops", "admin-modules", "reference-security"],
    escalation: "Escalate if webhook replay does not reconcile within 10 minutes.",
  },
  {
    title: "Admin cannot sign in",
    severity: "P1",
    symptom: "Owner login or OAuth flow fails or loops.",
    detectionSignals: [
      "Multiple admins report redirect loops or repeated unauthorized responses.",
      "Owner login action returns secret or callback configuration errors.",
      "OAuth provider reports invalid redirect URI or client secret mismatch.",
    ],
    firstResponse: [
      "Validate admin auth secrets and OAuth callback URLs.",
      "Confirm provider app status in Google and Microsoft consoles.",
      "Try owner credential login flow to isolate OAuth-specific failure.",
    ],
    containmentChecklist: [
      "Use least-privilege emergency admin account for active incident response.",
      "Temporarily disable problematic OAuth provider if it causes repeated lockouts.",
      "Restrict high-risk configuration edits until identity path is stable.",
    ],
    diagnostics: [
      "Test login on preview and production to isolate environment drift.",
      "Validate ADMIN_AUTH_SECRET and provider client credentials are in correct environment.",
      "Inspect auth route logs for repeated token/session failures.",
    ],
    serviceRecovery: [
      "Verify owner login and OAuth login both complete with stable session state.",
      "Check role resolution for owner, dispatch, and accounting accounts.",
      "Audit recent auth setting changes and document restoration steps.",
    ],
    escalationPacket: [
      "Impacted roles and count of failed login attempts.",
      "Provider-specific error messages and callback URL used.",
      "Recent auth-related deploys or setting changes.",
      "Emergency access method status.",
    ],
    linkedSections: ["platform-ops", "reference-security", "operating-guides"],
    escalation: "Escalate if all auth methods fail or multiple users are locked out.",
  },
  {
    title: "Dashboard data missing",
    severity: "P2",
    symptom: "Pages render but records are empty or stale.",
    detectionSignals: [
      "Counts unexpectedly drop to zero while service activity continues.",
      "Specific modules load shell UI but no records.",
      "Admin reports stale data that does not reflect latest operations.",
    ],
    firstResponse: [
      "Validate database connectivity and schema sync state.",
      "Check recent deploy logs for Prisma generation or query errors.",
      "Confirm webhook ingestion endpoints are healthy for external data updates.",
    ],
    containmentChecklist: [
      "Pause high-impact data edits until source-of-truth consistency is confirmed.",
      "Switch critical workflows to validated modules only.",
      "Capture scope of missing entities (customers, invoices, bookings, etc.).",
    ],
    diagnostics: [
      "Run targeted queries to verify records exist at the database level.",
      "Compare API response payloads against module expectations.",
      "Identify whether issue is read path, write path, or ingestion lag.",
    ],
    serviceRecovery: [
      "Restore affected ingestion/read paths and verify with known test entities.",
      "Reconcile stale records and rerun any deferred sync jobs.",
      "Confirm module metrics return to expected trend range.",
    ],
    escalationPacket: [
      "Affected modules and data domains.",
      "First observed stale timestamp and newest confirmed good timestamp.",
      "Database and API log excerpts for failing requests.",
      "Temporary mitigations in place.",
    ],
    linkedSections: ["admin-modules", "platform-ops", "reference-security"],
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
    startOfDayChecks: [
      "Confirm overnight incident queue is empty or actively assigned.",
      "Verify payment pipeline health before approving promotional campaigns.",
      "Scan deployment timeline for unplanned production changes.",
    ],
    dailyWorkflow: [
      "Review Reporting for business trend shifts.",
      "Approve or escalate unusual operational events.",
      "Validate platform status pages if any module is unstable.",
      "Confirm one backup and recovery control each day.",
    ],
    endOfDayChecks: [
      "Confirm no unresolved P1 or P2 incidents remain unassigned.",
      "Review high-risk audit events from last shift.",
      "Hand off pending financial or access-risk items with explicit owners.",
    ],
    handoffProtocol: [
      "Write a short status update with what changed, why, and next checks.",
      "Link all active incidents and current severity state.",
      "Identify blocked decisions requiring owner approval.",
    ],
    highRiskMistakes: [
      "Approving emergency config edits without rollback plan.",
      "Rotating secrets without post-rotation verification test.",
      "Ignoring repeated denied admin actions in audit history.",
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
    startOfDayChecks: [
      "Review today and tomorrow slot pressure by technician.",
      "Check for overnight cancellations, no-shows, or urgent pest reports.",
      "Confirm reminder automations fired for first appointment windows.",
    ],
    dailyWorkflow: [
      "Resolve schedule conflicts and customer reschedules quickly.",
      "Update technician statuses to avoid assignment drift.",
      "Coordinate with accounting if payment status blocks service.",
      "Escalate critical customer-impact incidents within 15 minutes.",
    ],
    endOfDayChecks: [
      "Validate next-day schedule has no unassigned high-priority stops.",
      "Capture unresolved customer promises for next shift.",
      "Flag technician capacity risks for owner review.",
    ],
    handoffProtocol: [
      "Share open schedule conflicts with affected customer IDs.",
      "Document temporary overrides applied during the day.",
      "Mark which escalations are waiting on payments or security teams.",
    ],
    highRiskMistakes: [
      "Double-booking technicians during high-volume windows.",
      "Rescheduling without confirming customer contact window.",
      "Leaving exception-based routing changes undocumented.",
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
    startOfDayChecks: [
      "Review overnight failed charges and identify repeat failures.",
      "Check unresolved invoice aging buckets for immediate outreach.",
      "Confirm Stripe webhook success rate baseline before batch actions.",
    ],
    dailyWorkflow: [
      "Reconcile payment status against invoice status.",
      "Retry failed charges and log outcomes.",
      "Escalate unresolved payment sync issues rapidly.",
      "Verify credential access for financial tools is still least-privilege.",
    ],
    endOfDayChecks: [
      "Confirm refund queue is resolved or assigned.",
      "Validate reconciliation notes for every manual financial override.",
      "Send summary of unresolved high-value balances.",
    ],
    handoffProtocol: [
      "List high-risk invoices and customer impact notes.",
      "Attach payment event IDs for all unresolved sync issues.",
      "Record who owns next retry/reconciliation window.",
    ],
    highRiskMistakes: [
      "Retrying charges without validating previous partial settlements.",
      "Processing refunds without matching incident or audit context.",
      "Treating webhook latency as charge failure without confirming Stripe state.",
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
    ifUnknownPath: [
      "Run parallel checks from two networks to exclude local ISP/cache issues.",
      "Treat uncertain state as P1 degraded service until confidence improves.",
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
    ifUnknownPath: [
      "Sample three recent transactions before broad remediation.",
      "Hold automated retries briefly to avoid duplicate customer actions.",
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
    ifUnknownPath: [
      "Use controlled emergency access path with owner approval.",
      "Freeze non-essential auth changes until cause is isolated.",
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
  {
    term: "Incident commander",
    definition: "The single person coordinating decisions during an active incident.",
    detail: "The incident commander owns severity, assignment, timeline, and closure criteria during outages.",
    category: "Operations",
  },
  {
    term: "Blast radius",
    definition: "How much of the system and user base is impacted by a failure.",
    detail: "Estimate blast radius early to prioritize mitigation and communication strategy.",
    category: "Recovery",
  },
  {
    term: "SLA",
    definition: "Service level agreement target for uptime or response behavior.",
    detail: "Use SLA framing when deciding whether an incident is P1, P2, or P3 and when to escalate.",
    category: "Operations",
  },
  {
    term: "Synthetic check",
    definition: "Automated request that continuously validates key user paths.",
    detail: "Synthetic checks catch regressions quickly by testing booking, auth, and payment entry points.",
    category: "Monitoring",
  },
  {
    term: "Webhook replay",
    definition: "Re-sending previously failed webhook events to recover missed processing.",
    detail: "Replay in controlled batches and verify invoice reconciliation before resuming automation.",
    category: "Integrations",
  },
  {
    term: "Least privilege",
    definition: "Granting only the minimum access needed to perform a task.",
    detail: "Apply least privilege to admin roles, API keys, and credential sharing to reduce breach impact.",
    category: "Security",
  },
  {
    term: "Credential rotation",
    definition: "Replacing a secret value with a new one and validating access.",
    detail: "Rotate after staff changes, suspected leakage, or scheduled security cadence.",
    category: "Credentials",
  },
  {
    term: "RPO",
    definition: "Recovery point objective, the maximum acceptable data loss window.",
    detail: "Use RPO to judge urgency when data ingestion or writes are delayed.",
    category: "Recovery",
  },
  {
    term: "RTO",
    definition: "Recovery time objective, the maximum acceptable downtime duration.",
    detail: "Use RTO when choosing rollback versus in-place debugging under customer impact.",
    category: "Recovery",
  },
  {
    term: "Smoke test",
    definition: "A small set of high-value checks after a deploy or fix.",
    detail: "Run smoke tests on homepage, booking, admin login, and payment flow before declaring recovery.",
    category: "Operations",
  },
  {
    term: "Runbook",
    definition: "A documented step-by-step operational procedure.",
    detail: "Runbooks reduce improvisation and improve consistency under pressure.",
    category: "Operations",
  },
  {
    term: "Configuration drift",
    definition: "Unexpected difference between intended and actual environment settings.",
    detail: "Common drift points include Vercel environment variables, OAuth callbacks, and Stripe webhook secrets.",
    category: "Configuration",
  },
  {
    term: "Idempotency",
    definition: "Designing operations so repeated requests do not create duplicate side effects.",
    detail: "Critical for payment retries and webhook handling to avoid duplicate charges or state changes.",
    category: "Integrations",
  },
  {
    term: "Audit trail",
    definition: "A chronological log of who changed what and when.",
    detail: "Use audit trails for incident forensics, compliance checks, and accountability.",
    category: "Security",
  },
  {
    term: "Canary change",
    definition: "A low-risk rollout to a subset before full deployment.",
    detail: "Canary style validation can reduce blast radius of operational changes.",
    category: "Operations",
  },
  {
    term: "Error budget",
    definition: "Allowed amount of instability within a time window before shipping slows.",
    detail: "Use error budget signals to decide when to prioritize reliability over feature delivery.",
    category: "Monitoring",
  },
  {
    term: "Escalation packet",
    definition: "Structured incident handoff information for faster resolution.",
    detail: "Includes severity, timeline, error signatures, actions taken, and next decision points.",
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
  const sectionLabelById = new Map(navSections.map((section) => [section.id, section.label]));

  const manualCoverageStats = [
    { label: "Manual sections", value: navSections.length },
    { label: "Platform runbooks", value: platformSections.length },
    { label: "Incident playbooks", value: incidentGuides.length },
    { label: "Decision trees", value: emergencyDecisionTrees.length },
    { label: "Role guides", value: roleWalkthroughs.length },
    { label: "Glossary terms", value: glossaryItems.length },
    { label: "Dashboard modules", value: dashboardModules.length },
  ];

  return (
    <AdminShell
      title="Operations Manual and Credential Vault"
      subtitle="A complete plain-language guide to how the website is built, hosted, deployed, and managed, including secure credential handling."
    >
      <ManualTopControls sections={navSections} />

      <section aria-label="Operations assistant" className="mt-5 mb-6">
        <AdminManualAssistant />
        <div className="mt-4">
          <AdminManualAssistantMetrics />
        </div>
      </section>

      <section aria-label="Manual coverage overview" className="mb-6 rounded-2xl border border-[#d3c6a8] bg-[#fff6e7] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6b61]">Coverage Overview</p>
            <p className="mt-1 text-sm text-[#445349]">This snapshot tracks the depth and breadth of the current operator manual.</p>
          </div>
          <span className="rounded-full border border-[#35506b] bg-[#f7efe2] px-2.5 py-1 text-[0.68rem] font-semibold text-[#233d5a]">
            Last refresh: May 2026
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {manualCoverageStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#deceb0] bg-[#fffdf4] p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#566b60]">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-[#20372c]">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <ManualSectionFrame
        id="quick-start"
        eyebrow="Orientation"
        title="Executive Start Here"
        defaultOpen={false}
        summary="Start with the emergency checklist, then use the visual flows and assistant for fast orientation."
        stats={["Crisis first", "Runbook depth", "2 visual guides"]}
        description="Start with crisis response, then use visual flows and assistant support to orient quickly."
      >
        <div className="grid gap-4 lg:grid-cols-4">
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
                <li>Capture first failing timestamp and affected customer surfaces.</li>
                <li>Pause risky automations until failure mode is understood.</li>
                <li>Create escalation packet before handoff.</li>
                <li>Do not declare recovery until smoke tests pass for booking and payments.</li>
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
                <li>Use Glossary terms to normalize language in incident notes.</li>
              </ol>
            </div>
          </details>
          <details className="rounded-xl border border-[#deceb0] bg-[#fff4df]">
            <summary className="list-none cursor-pointer px-4 py-3">
              <p className="text-base font-semibold text-[#20372c]">Escalation Packet Template</p>
              <p className="mt-1 text-sm text-[#445349]">Copy this structure before escalating to engineering.</p>
            </summary>
            <div className="border-t border-[#e4d4b5] px-4 py-3">
              <ol className="list-inside list-decimal space-y-1 text-sm text-[#445349]">
                <li>Severity (P1/P2/P3) and blast radius.</li>
                <li>First detection source and timestamp.</li>
                <li>Customer-facing symptoms and affected modules.</li>
                <li>Top error signatures with links/screenshots.</li>
                <li>Actions completed with outcomes.</li>
                <li>Current mitigation and remaining risk.</li>
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
        stats={["3 roles", "4 routines", "Incident command"]}
        description="Follow these role-specific flows, architecture cues, and recurring routines to run operations consistently."
        defaultOpen={false}
      >
        <div className="space-y-4">
          <ManualRoleWalkthroughs walkthroughs={roleWalkthroughs} />

          <div className="rounded-xl border border-[#d3c29f] bg-[#fff9eb] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Incident Command Protocol</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-[#d8c8aa] bg-[#fffdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">1. Declare</p>
                <p className="mt-2 text-sm text-[#445349]">Assign severity and incident commander within five minutes.</p>
              </div>
              <div className="rounded-lg border border-[#d8c8aa] bg-[#fffdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">2. Contain</p>
                <p className="mt-2 text-sm text-[#445349]">Reduce blast radius with rollback, feature limits, or manual fallback.</p>
              </div>
              <div className="rounded-lg border border-[#d8c8aa] bg-[#fffdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">3. Recover</p>
                <p className="mt-2 text-sm text-[#445349]">Restore critical flows and verify with smoke-test checklist.</p>
              </div>
              <div className="rounded-lg border border-[#d8c8aa] bg-[#fffdf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">4. Learn</p>
                <p className="mt-2 text-sm text-[#445349]">Document root cause, preventative controls, and ownership.</p>
              </div>
            </div>
          </div>

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
                <li>Review error-budget trend and reliability debt backlog.</li>
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
        stats={["15 modules", "Cross-module SOP", "Reference + workflow"]}
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

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Change Safety Loop</h3>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-[#445349]">
              <li>Define intended module outcome and blast radius.</li>
              <li>Apply change with smallest possible scope.</li>
              <li>Validate downstream effects in dependent modules.</li>
              <li>Record what changed in audit-friendly language.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Dependency Awareness</h3>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
              <li>CRM updates affect scheduling and invoicing context.</li>
              <li>Schedule changes can affect dispatch, notifications, and billing timing.</li>
              <li>Payment status drives invoice lifecycle and service-hold decisions.</li>
              <li>Automation failures may silently impact multiple modules.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Escalation Triggers</h3>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
              <li>Repeated failed payments with stale invoice state.</li>
              <li>Multiple modules reporting missing or stale records.</li>
              <li>Unexpected spikes in admin permission changes.</li>
              <li>Critical workflow blocked for more than 15 minutes.</li>
            </ul>
          </div>
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
        stats={["4 playbooks", "Runbook depth", "3 decision trees"]}
        description="Use these guided response paths to stabilize service quickly and reduce improvisation during outages."
        defaultOpen={false}
      >
        <div className="space-y-4">
          {incidentGuides.map((guide) => (
            <article key={guide.title} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#20372c]">{guide.title}</h3>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${
                    guide.severity === "P1"
                      ? "border-[#a13b1f] bg-[#fff1ea] text-[#8a321a]"
                      : guide.severity === "P2"
                        ? "border-[#8c6c2c] bg-[#fff8df] text-[#6f531f]"
                        : "border-[#46658c] bg-[#edf5ff] text-[#2c4f78]"
                  }`}
                >
                  {guide.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Symptom:</span> {guide.symptom}</p>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Detection signals</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {guide.detectionSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">First response steps</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#445349]">
                {guide.firstResponse.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Containment checklist</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {guide.containmentChecklist.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-[#d8c8aa] bg-[#fff9ed] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Diagnostics</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {guide.diagnostics.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Service recovery</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#445349]">
                {guide.serviceRecovery.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">Escalation packet</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                {guide.escalationPacket.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <p className="mt-3 text-sm text-[#445349]"><span className="font-semibold text-[#2d4538]">Linked sections:</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {guide.linkedSections.map((sectionId) => (
                  <a
                    key={sectionId}
                    href={`#${sectionId}`}
                    className="rounded-full border border-[#35506b] bg-[#f7efe2] px-3 py-1 text-xs font-semibold text-[#233d5a] transition hover:bg-[#233d5a] hover:text-white"
                  >
                    {sectionLabelById.get(sectionId) ?? sectionId}
                  </a>
                ))}
              </div>
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
                <div className="mt-3 rounded-lg border border-[#d8c8aa] bg-[#fff8eb] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#375044]">If unknown or mixed signals</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#445349]">
                    {tree.ifUnknownPath.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
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
        stats={["Expanded glossary", "Security rules", "Vault standards"]}
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
                <li>Document reason and owner for every privileged credential use.</li>
                <li>Escalate unusual access patterns as a security incident.</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Credential Lifecycle</h3>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-[#445349]">
                <li>Create with title, owner intent, and platform scope.</li>
                <li>Verify access immediately after entry.</li>
                <li>Review usage and staleness weekly.</li>
                <li>Rotate on schedule or incident trigger.</li>
                <li>Retire and deactivate old values safely.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Emergency Access Rules</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Use emergency credentials only during active incidents.</li>
                <li>Require owner acknowledgement for P1 usage.</li>
                <li>Log access purpose, start time, and end time.</li>
                <li>Rotate emergency credentials after incident closure.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#375044]">Verification Drill</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
                <li>Choose one platform each week and run access verification.</li>
                <li>Validate portal URL, username, MFA method, and role scope.</li>
                <li>Document gaps and set owner/date for remediation.</li>
                <li>Confirm audit log entries were captured correctly.</li>
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
