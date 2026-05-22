export type AdminManualKnowledgeEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  sourceHint: string;
};

type ScoredAdminManualKnowledgeEntry = AdminManualKnowledgeEntry & {
  score: number;
};

const adminManualKnowledgeBase: AdminManualKnowledgeEntry[] = [
  {
    id: "system_architecture",
    title: "System architecture overview",
    body:
      "The website is a Next.js application. Public pages and admin pages are in src/app. Server API routes live under src/app/api. Shared business logic and integrations are in src/lib. Reusable UI is in src/components.",
    tags: ["architecture", "nextjs", "app-router", "codebase", "layout"],
    sourceHint: "src/app, src/app/api, src/lib, src/components",
  },
  {
    id: "deployment_pipeline",
    title: "Deployment pipeline from code to production",
    body:
      "Extrasure deploys from GitHub to Vercel using npm run build. For production incidents after merge, inspect the failed deployment logs first, then roll back to the last successful production deployment in Vercel. Before re-deploying, verify production environment variables and Prisma schema selection for Postgres vs local file database behavior.",
    tags: ["deployment", "pipeline", "github", "vercel", "rollback"],
    sourceHint: "README.md, vercel.json, scripts/prisma-prepare.mjs",
  },
  {
    id: "admin_modules_map",
    title: "Admin module map",
    body:
      "Main admin modules include overview, customers, plans, schedule, technicians, estimates, invoices, payments, reporting, inventory, automations, settings, and audit logs. Most route files live under src/app/admin/<module>/page.tsx with supporting logic in src/lib.",
    tags: ["admin", "modules", "dashboard", "navigation"],
    sourceHint: "src/app/admin, src/components/admin, src/lib",
  },
  {
    id: "admin_manual_and_secrets",
    title: "Admin manual and credential vault",
    body:
      "The manual page is the plain-language operator handbook. It includes platform guides, incident playbooks, and a secure secret reveal flow. Secret category logic and CRUD behavior live in admin manual store modules.",
    tags: ["manual", "secrets", "vault", "operations"],
    sourceHint: "src/app/admin/manual/page.tsx, src/lib/admin-manual-store.ts",
  },
  {
    id: "admin_authentication",
    title: "Admin authentication and authorization",
    body:
      "Admin sessions are managed in admin-auth utilities. requireAdminApiSession protects API routes. requireAdminRole and requireAdminApiRole enforce role-based access. Missing session should return unauthorized for API routes.",
    tags: ["auth", "admin", "roles", "security", "session"],
    sourceHint: "src/lib/admin-auth.ts",
  },
  {
    id: "triage_module",
    title: "AI triage and escalation module",
    body:
      "AI triage routes classify customer pest issues, compute confidence, and flag cases for human review. Policies decide escalation thresholds. Triage data and export flows are available in dedicated admin routes and helper libraries.",
    tags: ["triage", "ai", "escalation", "confidence", "admin"],
    sourceHint: "src/app/api/ai/triage/route.ts, src/lib/ai-triage.ts, src/lib/ai-policy.ts",
  },
  {
    id: "payments_and_billing",
    title: "Payments, invoices, and billing workflows",
    body:
      "Admin payment operations run through /admin/payments and Stripe-backed API routes. For payment drift, treat webhook processing as source of truth and inspect /api/admin/stripe/webhook deliveries before manual reconciliation. Use retry, refund, and portal actions only after confirming invoice state in admin payments data.",
    tags: ["stripe", "payments", "invoices", "billing", "webhook"],
    sourceHint: "README.md, src/app/admin/payments/page.tsx, src/app/api/admin/payments/route.ts, src/app/api/admin/stripe/webhook/route.ts",
  },
  {
    id: "vercel_platform",
    title: "Vercel platform responsibilities",
    body:
      "Vercel hosts runtime, API routes, and cron execution for triage retention. Production diagnostics should start with deployment status and function logs, then verify environment variables used by auth, Stripe, and AI endpoints. For routing incidents, validate domain settings in the Vercel project before changing external DNS records.",
    tags: ["vercel", "hosting", "runtime", "logs", "env"],
    sourceHint: "README.md, vercel.json, src/app/admin/manual/page.tsx",
  },
  {
    id: "github_platform",
    title: "GitHub platform responsibilities",
    body:
      "GitHub stores source code, pull requests, issues, and commit history. Branch protection and review policy reduce risky changes. Incident investigation should map production behavior to specific merges and commits.",
    tags: ["github", "source-control", "pr", "incident"],
    sourceHint: "README.md, docs/THEME-REDESIGN-PR-OUTLINES.md",
  },
  {
    id: "openai_platform",
    title: "OpenAI platform responsibilities",
    body:
      "OpenAI features in Extrasure require OPENAI_API_KEY and optional AI_CHAT_MODEL overrides. If keys are missing or invalid, chat and triage surfaces may use deterministic fallback behavior. During AI incidents, verify key configuration per environment, then inspect endpoint-specific logs before adjusting prompts or model settings.",
    tags: ["openai", "ai", "model", "fallback", "api-key"],
    sourceHint: "README.md, docs/ENABLE-REAL-AI.md, src/app/api/ai/chat/route.ts, src/app/api/ai/triage/route.ts",
  },
  {
    id: "postgres_platform",
    title: "PostgreSQL and Prisma responsibilities",
    body:
      "PostgreSQL is the source of truth for customers, bookings, invoices, and audit data. Prisma schema files define data models and migrations. Schema and generated client must stay synchronized to avoid runtime and type errors.",
    tags: ["postgresql", "prisma", "database", "schema", "migrations"],
    sourceHint: "prisma/schema.prisma, prisma/schema.postgresql.prisma, src/lib/prisma.ts",
  },
  {
    id: "oauth_platform",
    title: "OAuth provider responsibilities",
    body:
      "Google and Microsoft OAuth are used for admin sign-in where enabled. Callback URLs must exactly match deployed domains. Provider client IDs and secrets are environment-driven and should only be changed through controlled credential workflows.",
    tags: ["oauth", "google", "microsoft", "signin", "callback"],
    sourceHint: "src/lib/admin-auth.ts, src/app/owner-login",
  },
  {
    id: "env_variables",
    title: "Important environment variables and purpose",
    body:
      "Critical runtime variables include DATABASE_URL, ADMIN_AUTH_SECRET, CUSTOMER_AUTH_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BILLING_ACCESS_SECRET, OPENAI_API_KEY, and AI_CHAT_MODEL. Validate environment values in the active Vercel environment before changing code when behavior differs between local and production.",
    tags: ["env", "secrets", "openai", "stripe", "database", "auth"],
    sourceHint: "README.md, src/lib/admin-auth.ts, src/app/api/ai/chat/route.ts, src/app/api/ai/triage/route.ts",
  },
  {
    id: "incident_response_basics",
    title: "Incident response basics",
    body:
      "Use the admin manual sequence: stabilize customer impact, identify affected surfaces, collect timestamps, then choose platform-specific checks. For outages check Vercel deployment status and rollback target. For billing incidents verify Stripe webhook delivery and replay. For admin sign-in issues confirm ADMIN_AUTH_SECRET or OAuth callback configuration.",
    tags: ["incident", "outage", "rollback", "payments", "auth"],
    sourceHint: "src/app/admin/manual/page.tsx, README.md",
  },
  {
    id: "dns_and_domain_basics",
    title: "DNS and domain basics",
    body:
      "For Extrasure production routing, validate domain settings in Vercel first, then apply only the exact required records at your DNS provider. Confirm root and www records point to the active Vercel project alias, verify SSL is issued, and cross-check SITE_URL or NEXT_PUBLIC_SITE_URL so links and redirects stay aligned after propagation.",
    tags: ["dns", "domain", "ssl", "routing", "vercel"],
    sourceHint: "README.md, vercel project domain settings",
  },
  {
    id: "major_behavior_locations",
    title: "Where major behavior lives in the codebase",
    body:
      "Public pages are under src/app and owner operations are under src/app/admin. Admin assistant behavior is in src/app/api/admin/manual-assistant/route.ts. Payment orchestration sits in src/app/api/admin/payments/route.ts and src/lib/stripe-billing.ts. Core authorization and operational helpers live in src/lib.",
    tags: ["paths", "codebase", "location", "api", "admin"],
    sourceHint: "src/app, src/app/admin, src/app/api/admin, src/lib",
  },
  {
    id: "audit_and_compliance",
    title: "Audit and compliance traceability",
    body:
      "Operationally sensitive events should be traceable through audit logs and platform event logs. Record who changed critical settings and when. Cross-check app-level audit entries with Stripe, Vercel, and GitHub timestamps during investigations.",
    tags: ["audit", "compliance", "forensics", "logs"],
    sourceHint: "src/lib/audit-log.ts, src/app/admin/audit-logs",
  },
  {
    id: "admin_settings_security",
    title: "Admin settings and security controls",
    body:
      "Security settings modules manage privileged access and role assignments. Use least privilege principles and avoid sharing high-privilege credentials. Rotate secrets when staff changes occur or incidents suggest credential exposure.",
    tags: ["security", "admin-settings", "roles", "least-privilege"],
    sourceHint: "src/app/admin/settings, src/lib/admin-auth.ts",
  },
  {
    id: "operational_reports",
    title: "Reporting and operational metrics",
    body:
      "Reporting views summarize revenue, conversion, and operational health. Validate date filters and source completeness before making strategic decisions. Single-day anomalies should be confirmed over wider time windows.",
    tags: ["reporting", "metrics", "analytics", "operations"],
    sourceHint: "src/app/admin/reporting, src/lib/admin-page-data.ts",
  },
];

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreEntry(entry: AdminManualKnowledgeEntry, tokens: string[]) {
  if (tokens.length === 0) {
    return 0;
  }

  const titleText = entry.title.toLowerCase();
  const bodyText = entry.body.toLowerCase();
  const tagsText = entry.tags.join(" ").toLowerCase();
  const sourceText = entry.sourceHint.toLowerCase();

  return tokens.reduce((score, token) => {
    let nextScore = score;

    if (titleText.includes(token)) {
      nextScore += 3;
    }

    if (tagsText.includes(token)) {
      nextScore += 2;
    }

    if (bodyText.includes(token)) {
      nextScore += 1;
    }

    if (sourceText.includes(token)) {
      nextScore += 1;
    }

    return nextScore;
  }, 0);
}

export function getAdminManualKnowledgeMatches(query: string, max = 4) {
  const tokens = tokenize(query);

  if (!tokens.length) {
    return [] as ScoredAdminManualKnowledgeEntry[];
  }

  return adminManualKnowledgeBase
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, max);
}

export function buildAdminManualKnowledgeContext(query: string) {
  const matches = getAdminManualKnowledgeMatches(query);

  if (!matches.length) {
    return {
      confidence: "low" as const,
      contextText: "",
      sourceTitles: [] as string[],
    };
  }

  const contextText = matches
    .map((match, index) => `${index + 1}. ${match.title}\nSummary: ${match.body}\nSource path: ${match.sourceHint}`)
    .join("\n\n");

  const confidence = matches[0].score >= 7 ? ("high" as const) : matches[0].score >= 4 ? ("medium" as const) : ("low" as const);

  return {
    confidence,
    contextText,
    sourceTitles: matches.map((match) => match.title),
  };
}