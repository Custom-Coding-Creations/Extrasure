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
      "Code is reviewed in GitHub pull requests, then merged to main. Vercel builds and deploys main to production. Preview deployments are created for branches. If production breaks after a merge, rollback to the last successful deployment in Vercel.",
    tags: ["deployment", "pipeline", "github", "vercel", "rollback"],
    sourceHint: "README.md, vercel.json, next.config.ts",
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
      "Stripe is used for collecting payments, retries, refunds, and webhooks. Admin payment tools coordinate invoice state with Stripe events. If payment status and invoice status drift, review webhook delivery history first.",
    tags: ["stripe", "payments", "invoices", "billing", "webhook"],
    sourceHint: "src/components/admin, src/app/admin/payments, src/app/admin/invoices",
  },
  {
    id: "vercel_platform",
    title: "Vercel platform responsibilities",
    body:
      "Vercel hosts the production runtime and executes API routes. It stores environment variables per environment and exposes deployment and function logs. Use Vercel logs first when production behavior differs from local.",
    tags: ["vercel", "hosting", "hosted", "website", "runtime", "logs", "env"],
    sourceHint: "docs/ACCOUNT-OS-ROLLOUT-PR.md, vercel.json",
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
      "OpenAI powers chatbot and assistant responses when OPENAI_API_KEY is configured. Model choice is controlled by environment variables such as AI_CHAT_MODEL and feature-specific model overrides. Fallback responses are used when AI is unavailable.",
    tags: ["openai", "ai", "model", "fallback", "api-key"],
    sourceHint: "src/app/api/ai/chat/route.ts, src/app/api/ai/triage/route.ts",
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
      "Google and Microsoft OAuth are used for admin sign-in where enabled. Callback URLs must exactly match deployed domains. Provider client IDs and secrets are environment-driven and should only be changed through controlled credential workflows. For Google login credentials and app settings, use Google Cloud Console and the Admin Manual credential vault entries.",
    tags: ["oauth", "google", "google cloud", "microsoft", "signin", "callback", "credentials"],
    sourceHint: "src/lib/admin-auth.ts, src/app/owner-login",
  },
  {
    id: "env_variables",
    title: "Important environment variables and purpose",
    body:
      "Key variables include OPENAI_API_KEY for AI calls, AI_CHAT_MODEL for model defaults, DATABASE_URL for PostgreSQL, STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for Stripe operations, and CUSTOMER_AUTH_SECRET or ADMIN_AUTH_SECRET for login session signing.",
    tags: ["env", "secrets", "openai", "stripe", "database", "auth"],
    sourceHint: "src/lib/admin-auth.ts, src/app/api/ai/chat/route.ts, src/app/api/ai/triage/route.ts",
  },
  {
    id: "incident_response_basics",
    title: "Incident response basics",
    body:
      "First stabilize customer impact, then identify blast radius, then collect logs and timestamps. For outage incidents check Vercel deploy status and rollback path. For payment incidents check Stripe webhook delivery and replay. For auth incidents verify secrets and OAuth callback configuration.",
    tags: ["incident", "outage", "rollback", "payments", "auth"],
    sourceHint: "src/app/admin/manual/page.tsx",
  },
  {
    id: "dns_and_domain_basics",
    title: "DNS and domain basics",
    body:
      "DNS maps your domain name to the hosting provider. If domain records are incorrect, users cannot reach the expected deployment. For production outages, confirm domain records point to the correct Vercel project and that SSL certificates are valid.",
    tags: ["dns", "domain", "nameserver", "ssl", "routing", "fix", "vercel"],
    sourceHint: "Vercel project domain settings",
  },
  {
    id: "major_behavior_locations",
    title: "Where major behavior lives in the codebase",
    body:
      "Public pages are in src/app, admin dashboard pages are in src/app/admin, API endpoints are in src/app/api, payment UI and admin controls are in src/components and src/components/admin, and core workflows are in src/lib.",
    tags: ["paths", "codebase", "location", "api", "admin"],
    sourceHint: "src/app, src/app/admin, src/app/api, src/components, src/lib",
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
      contextText:
        "No direct internal manual match found. Ask the operator to clarify whether the question is about website behavior, admin workflows, deployment, or platform credentials.",
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