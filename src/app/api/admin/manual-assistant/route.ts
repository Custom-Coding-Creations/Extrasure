import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { buildAdminManualKnowledgeContext } from "@/lib/admin-manual-knowledge";
import { retrieveAdminManualContext } from "@/lib/admin-manual-retrieval";

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

function buildFallbackAnswer(args: {
  contextText: string;
  confidence: "low" | "medium" | "high";
  inScope: boolean;
}) {
  if (!args.inScope) {
    return [
      "That looks outside this assistant's scope.",
      "I can only answer questions about this website's admin operations, deployment, codebase structure, and connected platforms.",
      "Please ask a website-specific question, for example: 'How do I rollback in Vercel?' or 'Where is admin authentication handled in the codebase?'",
    ].join(" ");
  }

  if (args.confidence === "low") {
    return [
      "I do not have a direct internal match for that yet.",
      "Please clarify whether this is about admin workflows, deployment, payments, authentication, or infrastructure.",
      "Safety warning: before any risky change in production, confirm a rollback path and capture logs first.",
    ].join(" ");
  }

  return [
    "Here is what the internal operations manual says:",
    args.contextText,
    "Safety warning: for any risky action (credential changes, production deploys, webhook edits, or role updates), perform one change at a time and verify impact before continuing.",
  ].join("\n\n");
}

async function getOpenAiAnswer(args: {
  message: string;
  history: ManualAssistantMessage[];
  contextText: string;
  inScope: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_CHAT_MODEL ?? "gpt-4.1-mini";
  const systemPrompt = [
    "You are the internal owner operations copilot for the ExtraSure website.",
    "Answer only about this website, its codebase, operations, admin workflows, and devops setup.",
    "If the request is out of scope, explicitly say it is out of scope and ask one clarifying question.",
    "Use beginner-friendly language and provide step-by-step guidance.",
    "Before any risky action, include a short safety warning.",
    "Never claim certainty when context is missing.",
  ].join(" ");

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
          content: `Operator message: ${args.message}\n\nScope classification: ${args.inScope ? "in-scope" : "out-of-scope"}\n\nInternal manual and codebase context:\n${args.contextText}`,
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

  const effectiveScope = scope.inScope || retrieval.matches.length > 0 || knowledge.sourceTitles.length > 0;

  const aiAnswer = await getOpenAiAnswer({
    message,
    history,
    contextText: combinedContext,
    inScope: effectiveScope,
  });

  const answer = aiAnswer ?? buildFallbackAnswer({
    contextText: combinedContext || knowledge.contextText,
    confidence: knowledge.confidence,
    inScope: effectiveScope,
  });

  const sourcePaths = retrieval.sourcePaths;

  return NextResponse.json({
    ok: true,
    answer,
    confidence: knowledge.confidence,
    sourceTitles: knowledge.sourceTitles,
    sourcePaths,
    scope: {
      inScope: effectiveScope,
      reason: scope.reason,
    },
  });
}