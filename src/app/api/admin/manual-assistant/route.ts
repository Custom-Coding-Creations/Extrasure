import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { buildAdminManualKnowledgeContext } from "@/lib/admin-manual-knowledge";
import { retrieveAdminManualContext } from "@/lib/admin-manual-retrieval";
import { recordAdminManualAssistantResponseMode } from "@/lib/admin-manual-assistant-analytics";

export const runtime = "nodejs";

type ChatRole = "user" | "assistant";

type ManualAssistantMessage = {
  role: ChatRole;
  content: string;
};

type ManualAssistantRequest = {
  message?: string;
  history?: ManualAssistantMessage[];
};

type ScopeDecision = {
  inScope: boolean;
  reason: string;
};

type ManualSectionRecommendation = {
  anchor: string;
  label: string;
};

type AssistantResponseMode =
  | "out-of-scope"
  | "dns-clarifier"
  | "dns-guided"
  | "deploy-clarifier"
  | "deploy-guided"
  | "billing-clarifier"
  | "billing-guided"
  | "auth-clarifier"
  | "auth-guided"
  | "generic-clarifier"
  | "grounded-fallback"
  | "grounded-ai";

const STRONG_RETRIEVAL_SCORE = 6;
const DIRECT_RETRIEVAL_SCOPE_SCORE = 10;

const manualSectionCatalog: ManualSectionRecommendation[] = [
  { anchor: "quick-start", label: "Executive Start Here" },
  { anchor: "operating-guides", label: "Role Guides and Core Operating Patterns" },
  { anchor: "admin-modules", label: "Admin Dashboard Module Manual" },
  { anchor: "platform-ops", label: "Platform Operations" },
  { anchor: "incidents", label: "Incidents and Recovery" },
  { anchor: "reference-security", label: "Glossary and Credential Security" },
  { anchor: "owner-credentials", label: "Owner Credentials" },
];

const relatedTermCatalog = {
  dns: ["DNS", "Domain routing", "SITE_URL", "Rollback"],
  deploy: ["Deployment", "Rollback", "Smoke test", "Blast radius"],
  payment: ["Webhook replay", "Idempotency", "Invoice reconciliation", "Least privilege"],
  auth: ["OAuth", "Session", "Credential rotation", "Audit trail"],
  database: ["Schema", "Prisma", "RPO", "RTO"],
  general: ["Runbook", "Incident commander", "Escalation packet", "Configuration drift"],
};

const operationsProfile = {
  hostingPlatform: "Vercel",
  sourceControl: "GitHub (main branch deploy workflow)",
  paymentsPlatform: "Stripe webhook-driven reconciliation",
  runtimeDatabase: "Prisma with Postgres in production",
  criticalEnvVars: [
    "SITE_URL or NEXT_PUBLIC_SITE_URL",
    "ADMIN_AUTH_SECRET",
    "CUSTOMER_AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
  ],
};

const inScopeKeywords = [
  "admin",
  "dashboard",
  "deploy",
  "deployment",
  "vercel",
  "github",
  "stripe",
  "openai",
  "oauth",
  "dns",
  "domain",
  "prisma",
  "database",
  "postgres",
  "invoice",
  "payment",
  "webhook",
  "environment",
  "env",
  "code",
  "codebase",
  "api",
  "route",
  "auth",
  "login",
  "incident",
  "rollback",
  "hosting",
  "build",
  "manual",
  "operations",
];

function classifyScope(message: string): ScopeDecision {
  const query = message.toLowerCase();
  const inScope = inScopeKeywords.some((keyword) => query.includes(keyword));

  if (inScope) {
    return {
      inScope: true,
      reason: "keyword-match",
    };
  }

  return {
    inScope: false,
    reason: "not-website-ops-related",
  };
}

function getRecommendedSections(params: {
  message: string;
  mode: AssistantResponseMode;
  inScope: boolean;
  confidence: "low" | "medium" | "high";
}) {
  const query = params.message.toLowerCase();
  const picks: string[] = [];

  if (!params.inScope) {
    picks.push("quick-start", "operating-guides", "reference-security");
  }

  if (params.confidence === "low") {
    picks.push("incidents", "platform-ops");
  }

  if (query.includes("dns") || query.includes("domain") || params.mode.includes("dns")) {
    picks.push("platform-ops", "incidents", "reference-security");
  }

  if (query.includes("deploy") || query.includes("rollback") || query.includes("build") || params.mode.includes("deploy")) {
    picks.push("platform-ops", "incidents", "quick-start");
  }

  if (query.includes("payment") || query.includes("stripe") || query.includes("invoice") || query.includes("webhook") || params.mode.includes("billing")) {
    picks.push("platform-ops", "admin-modules", "incidents");
  }

  if (query.includes("auth") || query.includes("oauth") || query.includes("login") || params.mode.includes("auth")) {
    picks.push("platform-ops", "reference-security", "incidents");
  }

  if (query.includes("credential") || query.includes("secret") || query.includes("vault")) {
    picks.push("reference-security", "owner-credentials");
  }

  if (picks.length === 0) {
    picks.push("platform-ops", "admin-modules", "reference-security");
  }

  return picks
    .filter((value, index, all) => all.indexOf(value) === index)
    .map((anchor) => manualSectionCatalog.find((section) => section.anchor === anchor))
    .filter((section): section is ManualSectionRecommendation => Boolean(section))
    .slice(0, 4);
}

function getRelatedTerms(message: string) {
  const query = message.toLowerCase();
  const terms: string[] = [];

  if (query.includes("dns") || query.includes("domain")) {
    terms.push(...relatedTermCatalog.dns);
  }

  if (query.includes("deploy") || query.includes("rollback") || query.includes("build")) {
    terms.push(...relatedTermCatalog.deploy);
  }

  if (query.includes("payment") || query.includes("stripe") || query.includes("invoice") || query.includes("webhook")) {
    terms.push(...relatedTermCatalog.payment);
  }

  if (query.includes("auth") || query.includes("oauth") || query.includes("login") || query.includes("session")) {
    terms.push(...relatedTermCatalog.auth);
  }

  if (query.includes("database") || query.includes("postgres") || query.includes("prisma") || query.includes("schema")) {
    terms.push(...relatedTermCatalog.database);
  }

  terms.push(...relatedTermCatalog.general);

  return terms.filter((value, index, all) => all.indexOf(value) === index).slice(0, 10);
}

function normalizeHistory(history: ManualAssistantMessage[] | undefined) {
  if (!Array.isArray(history)) {
    return [] as ManualAssistantMessage[];
  }

  return history
    .filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string")
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-8);
}

function summarizeRecentHistory(history: ManualAssistantMessage[]) {
  const recentEntries = history.slice(-4);

  if (recentEntries.length === 0) {
    return "No prior conversation context.";
  }

  return recentEntries.map((entry, index) => `${index + 1}. ${entry.role}: ${entry.content}`).join("\n");
}

function buildOperationsProfileSummary() {
  return [
    `Hosting: ${operationsProfile.hostingPlatform}`,
    `Source control and deploy flow: ${operationsProfile.sourceControl}`,
    `Payments source of truth: ${operationsProfile.paymentsPlatform}`,
    `Data platform: ${operationsProfile.runtimeDatabase}`,
    `Critical environment variables: ${operationsProfile.criticalEnvVars.join(" | ")}`,
  ].join("\n");
}

function isDnsQuestion(message: string) {
  const query = message.toLowerCase();
  return query.includes("dns") || query.includes("domain");
}

function isDeploymentQuestion(message: string) {
  const query = message.toLowerCase();
  return query.includes("deploy") || query.includes("deployment") || query.includes("rollback") || query.includes("build");
}

function isPaymentWebhookQuestion(message: string) {
  const query = message.toLowerCase();
  return query.includes("stripe") || query.includes("payment") || query.includes("invoice") || query.includes("webhook") || query.includes("refund");
}

function isAuthQuestion(message: string) {
  const query = message.toLowerCase();
  return query.includes("auth") || query.includes("login") || query.includes("sign in") || query.includes("oauth") || query.includes("session");
}

function getRecentUserHistory(history: ManualAssistantMessage[]) {
  return history
    .filter((entry) => entry.role === "user")
    .slice(-4)
    .map((entry) => entry.content.toLowerCase())
    .join(" ");
}

function hasDnsClarifierAnswer(history: ManualAssistantMessage[]) {
  const recentUserText = getRecentUserHistory(history);
  return (
    recentUserText.includes("vercel")
    || recentUserText.includes("routing")
    || recentUserText.includes("registrar")
    || recentUserText.includes("cloudflare")
    || recentUserText.includes("godaddy")
    || recentUserText.includes("namecheap")
  );
}

function hasDeployClarifierAnswer(history: ManualAssistantMessage[]) {
  const recentUserText = getRecentUserHistory(history);
  return recentUserText.includes("build") || recentUserText.includes("runtime") || recentUserText.includes("rollback");
}

function hasBillingClarifierAnswer(history: ManualAssistantMessage[]) {
  const recentUserText = getRecentUserHistory(history);
  return recentUserText.includes("checkout") || recentUserText.includes("invoice") || recentUserText.includes("webhook") || recentUserText.includes("refund");
}

function hasAuthClarifierAnswer(history: ManualAssistantMessage[]) {
  const recentUserText = getRecentUserHistory(history);
  return recentUserText.includes("oauth") || recentUserText.includes("callback") || recentUserText.includes("session") || recentUserText.includes("password");
}

function buildFallbackAnswer(args: {
  message: string;
  history: ManualAssistantMessage[];
  contextText: string;
  confidence: "low" | "medium" | "high";
  inScope: boolean;
  grounded: boolean;
}) {
  if (!args.inScope) {
    return {
      answer: [
        "That looks outside this assistant's scope.",
        "I can only answer questions about this website's admin operations, deployment, codebase structure, and connected platforms.",
        "Please ask a website-specific question, for example: 'How do I rollback in Vercel?' or 'Where is admin authentication handled in the codebase?'",
      ].join(" "),
      mode: "out-of-scope" as AssistantResponseMode,
    };
  }

  if (!args.grounded || args.confidence === "low") {
    if (isDnsQuestion(args.message)) {
      if (hasDnsClarifierAnswer(args.history)) {
        return {
          answer: [
            "Thanks, that detail is enough to proceed with an Extrasure-specific DNS path.",
            "Since you already identified the routing context, validate Vercel domain mapping, then confirm SITE_URL or NEXT_PUBLIC_SITE_URL aligns with production and verify access after propagation.",
            "Safety warning: change one record at a time and verify production reachability before continuing.",
          ].join(" "),
          mode: "dns-guided" as AssistantResponseMode,
        };
      }

      return {
        answer: [
          "I can help with an Extrasure-specific DNS sequence, but I need one detail first.",
          "Are you updating Vercel project domain routing, or only DNS records at your registrar/provider?",
          "Extrasure baseline: verify Vercel domain mapping first, then confirm SITE_URL or NEXT_PUBLIC_SITE_URL still matches production after propagation.",
          "Safety warning: change one record at a time and verify production reachability before continuing.",
        ].join(" "),
        mode: "dns-clarifier" as AssistantResponseMode,
      };
    }

    if (isDeploymentQuestion(args.message)) {
      if (hasDeployClarifierAnswer(args.history)) {
        return {
          answer: [
            "Thanks, that deployment detail is enough to continue.",
            "Use the matching Extrasure path: inspect latest Vercel deployment logs, correlate with recent main branch merge history in GitHub, then validate environment variables before redeploying or rolling back.",
            "Safety warning: do not apply multiple production changes before validating impact from the first action.",
          ].join(" "),
          mode: "deploy-guided" as AssistantResponseMode,
        };
      }

      return {
        answer: [
          "I can map this to an Extrasure deployment runbook, but I need one detail first.",
          "Is this a failed Vercel build, a production runtime issue, or a rollback decision after merge?",
          "Extrasure baseline: check the latest Vercel deployment logs, confirm main branch merge context in GitHub, then verify environment variables before redeploying.",
          "Safety warning: do not apply multiple production changes before validating impact from the first action.",
        ].join(" "),
        mode: "deploy-clarifier" as AssistantResponseMode,
      };
    }

    if (isPaymentWebhookQuestion(args.message)) {
      if (hasBillingClarifierAnswer(args.history)) {
        return {
          answer: [
            "Thanks, that billing detail is enough to proceed.",
            "Follow the Extrasure sequence for that case: verify Stripe webhook delivery for the event first, then use admin payments actions for reconcile or replay if state still drifts.",
            "Safety warning: avoid manual status overrides until webhook history is verified.",
          ].join(" "),
          mode: "billing-guided" as AssistantResponseMode,
        };
      }

      return {
        answer: [
          "I can provide an Extrasure payment troubleshooting sequence, but I need one detail first.",
          "Are you seeing a failed checkout, invoice state mismatch, or missing Stripe webhook update?",
          "Extrasure baseline: treat webhook processing as source of truth, inspect Stripe delivery logs first, then use admin payments actions for reconcile or replay.",
          "Safety warning: avoid manual status overrides until webhook history is verified.",
        ].join(" "),
        mode: "billing-clarifier" as AssistantResponseMode,
      };
    }

    if (isAuthQuestion(args.message)) {
      if (hasAuthClarifierAnswer(args.history)) {
        return {
          answer: [
            "Thanks, that auth detail is enough to continue.",
            "Use the matching Extrasure auth path: validate ADMIN_AUTH_SECRET or CUSTOMER_AUTH_SECRET, confirm OAuth callback URLs, then verify admin-auth session and route protection behavior.",
            "Safety warning: rotate secrets in controlled steps and keep rollback access before sign-in changes.",
          ].join(" "),
          mode: "auth-guided" as AssistantResponseMode,
        };
      }

      return {
        answer: [
          "I can narrow this to an Extrasure auth flow, but I need one detail first.",
          "Is this owner password login, Google/Microsoft OAuth callback, or session expiry behavior?",
          "Extrasure baseline: confirm ADMIN_AUTH_SECRET or CUSTOMER_AUTH_SECRET, verify provider callback URLs, then validate admin-auth route protection behavior.",
          "Safety warning: rotate secrets in controlled steps and keep rollback access before sign-in changes.",
        ].join(" "),
        mode: "auth-clarifier" as AssistantResponseMode,
      };
    }

    return {
      answer: [
        "I do not have enough internal documentation to give a precise runbook yet.",
        "Please clarify whether this is about deployment routing, payments/webhooks, authentication, or database/runtime behavior so I can use the right internal playbook.",
        `Extrasure baseline stack: ${operationsProfile.hostingPlatform}, ${operationsProfile.paymentsPlatform}, ${operationsProfile.runtimeDatabase}.`,
        "Safety warning: perform one production change at a time and verify impact before continuing.",
      ].join(" "),
      mode: "generic-clarifier" as AssistantResponseMode,
    };
  }

  return {
    answer: [
      "Here is what the internal operations manual says:",
      args.contextText,
      "Safety warning: for any risky action (credential changes, production deploys, webhook edits, or role updates), perform one change at a time and verify impact before continuing.",
    ].join("\n\n"),
    mode: "grounded-fallback" as AssistantResponseMode,
  };
}

async function getOpenAiAnswer(args: {
  message: string;
  history: ManualAssistantMessage[];
  contextText: string;
  inScope: boolean;
  sourceTitles: string[];
  sourcePaths: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_CHAT_MODEL ?? "gpt-4.1-mini";
  const systemPrompt = [
    "You are the internal owner operations copilot for the ExtraSure website.",
    "Answer only about this website, its codebase, operations, admin workflows, and devops setup.",
    "Use only the supplied internal context and source list.",
    "Do not provide generic registrar or SaaS playbooks that are not anchored to the supplied context.",
    "If context is insufficient, say you need clarification and ask exactly one scoped follow-up question.",
    "If the request is out of scope, explicitly say it is out of scope and ask one clarifying question.",
    "Use beginner-friendly language and provide step-by-step guidance.",
    "Use recent conversation history to avoid repeating prior generic advice.",
    "Include a short 'Sources:' line with the internal files or modules you relied on.",
    "Before any risky action, include a short safety warning.",
    "Never claim certainty when context is missing.",
  ].join(" ");

  const sourceSummary = [
    `Source titles: ${args.sourceTitles.length > 0 ? args.sourceTitles.join(" | ") : "none"}`,
    `Source paths: ${args.sourcePaths.length > 0 ? args.sourcePaths.join(" | ") : "none"}`,
  ].join("\n");
  const recentHistorySummary = summarizeRecentHistory(args.history);
  const profileSummary = buildOperationsProfileSummary();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...args.history,
        {
          role: "user",
          content: `Operator message: ${args.message}\n\nScope classification: ${args.inScope ? "in-scope" : "out-of-scope"}\n\nExtrasure operations profile:\n${profileSummary}\n\nRecent conversation context:\n${recentHistorySummary}\n\n${sourceSummary}\n\nInternal manual and codebase context:\n${args.contextText}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  return content && content.length > 0 ? content : null;
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ManualAssistantRequest;

  try {
    payload = (await request.json()) as ManualAssistantRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = payload.message?.trim() ?? "";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history = normalizeHistory(payload.history);
  const scope = classifyScope(message);
  const knowledge = buildAdminManualKnowledgeContext(message);
  const retrieval = await retrieveAdminManualContext(message);
  const combinedContext = [knowledge.contextText, retrieval.contextText].filter((value) => value.length > 0).join("\n\n");

  const topRetrievalScore = retrieval.matches[0]?.score ?? 0;
  const hasStrongRetrieval = topRetrievalScore >= STRONG_RETRIEVAL_SCORE;
  const isGrounded = knowledge.confidence !== "low" || hasStrongRetrieval;
  const effectiveScope = scope.inScope || topRetrievalScore >= DIRECT_RETRIEVAL_SCOPE_SCORE;

  let aiAnswer: string | null = null;

  if (effectiveScope && isGrounded) {
    try {
      aiAnswer = await getOpenAiAnswer({
        message,
        history,
        contextText: combinedContext,
        inScope: effectiveScope,
        sourceTitles: knowledge.sourceTitles,
        sourcePaths: retrieval.sourcePaths,
      });
    } catch (error) {
      console.error("Manual assistant AI call failed:", error);
    }
  }

  const fallback = buildFallbackAnswer({
    message,
    history,
    contextText: combinedContext || knowledge.contextText,
    confidence: knowledge.confidence,
    inScope: effectiveScope,
    grounded: isGrounded,
  });
  const answer = aiAnswer ?? fallback.answer;
  const mode: AssistantResponseMode = aiAnswer ? "grounded-ai" : fallback.mode;
  const recommendedSections = getRecommendedSections({
    message,
    mode,
    inScope: effectiveScope,
    confidence: knowledge.confidence,
  });
  const relatedTerms = getRelatedTerms(message);
  let modeMetrics = {
    modeCount: 0,
    totalResponses: 0,
    modeCounts: {} as Record<string, number>,
  };

  try {
    modeMetrics = await recordAdminManualAssistantResponseMode(mode);
  } catch (error) {
    console.error("Failed to record manual assistant mode metrics:", error);
  }

  const sourcePaths = retrieval.sourcePaths;
  const sourceTitles = Array.from(new Set([...knowledge.sourceTitles, ...sourcePaths.map((path) => `Code citation: ${path}`)]));

  return NextResponse.json({
    ok: true,
    answer,
    confidence: knowledge.confidence,
    sourceTitles,
    sourcePaths,
    mode,
    modeCount: modeMetrics.modeCount,
    totalResponses: modeMetrics.totalResponses,
    modeCounts: modeMetrics.modeCounts,
    recommendedSections,
    relatedTerms,
    scope: {
      inScope: effectiveScope,
      reason: scope.reason,
    },
  });
}