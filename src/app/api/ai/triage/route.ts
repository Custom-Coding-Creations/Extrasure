import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { shouldEscalateTriageToHuman } from "@/lib/ai-policy";
import { buildDeterministicTriageFallback, validateTriageAssessmentOutput, type TriageAssessmentOutput } from "@/lib/ai-triage";
import { routeTriageTranscript } from "@/lib/ai-triage-routing";
import { queueTriageRetentionAutomationEvents } from "@/lib/admin-store";
import { recordAuditEvent } from "@/lib/audit-log";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getTriageHumanReviewConfidenceThreshold, isTriageEnabled } from "@/lib/triage-runtime";

type TriageRequest = {
  sessionId?: string;
  message?: string;
  answers?: Array<{ question: string; answer: string }>;
  photoUrls?: string[];
  serviceBookingId?: string;
  customerId?: string;
};

function getSessionId(rawSessionId: string | undefined) {
  return rawSessionId && rawSessionId.trim() ? rawSessionId.trim() : `triage_${randomUUID()}`;
}

function sanitizeAnswers(input: TriageRequest["answers"]) {
  if (!Array.isArray(input)) {
    return [] as Array<{ question: string; answer: string }>;
  }

  return input
    .map((item) => ({
      question: typeof item?.question === "string" ? item.question.trim() : "",
      answer: typeof item?.answer === "string" ? item.answer.trim() : "",
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 12);
}

function sanitizePhotoUrls(input: string[] | undefined) {
  if (!Array.isArray(input)) {
    return [] as string[];
  }

  return input.filter((item) => typeof item === "string" && /^https?:\/\//i.test(item)).slice(0, 4);
}

async function inferTriage(args: { message: string; answers: Array<{ question: string; answer: string }> }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      usedFallback: true,
      triage: buildDeterministicTriageFallback(args.message),
    };
  }

  const model = process.env.AI_TRIAGE_MODEL ?? process.env.AI_CHAT_MODEL ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "You are ExtraSure's AI Pest Triage Engine.",
            "Return strict JSON only with this exact shape:",
            "{ likelyPest, confidence, severity, urgency, recommendedService, estimatedPriceRange, recommendedTimeline, safetyConsiderations, followUpQuestions, riskFactors, conversionLikelihood }",
            "confidence must be between 0 and 1.",
            "severity must be one of low, moderate, high, critical.",
            "urgency must be one of monitor, soon, urgent, immediate.",
            "conversionLikelihood must be one of low, medium, high.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            message: args.message,
            answers: args.answers,
          }),
        },
      ],
      max_tokens: 350,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return {
      usedFallback: true,
      triage: buildDeterministicTriageFallback(args.message),
    };
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "";

  if (!content) {
    return {
      usedFallback: true,
      triage: buildDeterministicTriageFallback(args.message),
    };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    const validated = validateTriageAssessmentOutput(parsed);

    if (!validated.ok) {
      return {
        usedFallback: true,
        triage: buildDeterministicTriageFallback(args.message),
      };
    }

    return {
      usedFallback: false,
      triage: validated.data,
    };
  } catch {
    return {
      usedFallback: true,
      triage: buildDeterministicTriageFallback(args.message),
    };
  }
}

export async function POST(request: NextRequest) {
  if (!isTriageEnabled()) {
    return NextResponse.json(
      {
        error: "Triage is temporarily unavailable",
      },
      {
        status: 503,
      },
    );
  }

  const rateLimitKey = `${getRequestIp(request)}:api:ai:triage`;
  const rateLimitResult = checkRateLimit(rateLimitKey, 20, 60_000);

  if (!rateLimitResult.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let payload: TriageRequest;

  try {
    payload = (await request.json()) as TriageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = payload.message?.trim() ?? "";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const sessionId = getSessionId(payload.sessionId);
  const answers = sanitizeAnswers(payload.answers);
  const photoUrls = sanitizePhotoUrls(payload.photoUrls);
  const customerSession = await requireCustomerApiSession();
  const adminSession = await requireAdminApiSession();
  const customerId = customerSession?.customerId ?? (adminSession ? payload.customerId?.trim() : undefined) ?? null;

  const inference = await inferTriage({ message, answers });
  const triage = inference.triage;
  const humanReviewThreshold = getTriageHumanReviewConfidenceThreshold();
  const confidenceTriggeredHumanReview = triage.confidence < humanReviewThreshold;
  const needsFollowUp = shouldEscalateTriageToHuman(triage.confidence, triage.severity) || confidenceTriggeredHumanReview;

  let assessmentId: string | null = null;

  if (customerId) {
    const created = await prisma.triageAssessment.create({
      data: {
        id: `triage_${randomUUID()}`,
        customerId,
        serviceBookingId: payload.serviceBookingId?.trim() || null,
        likelyPest: triage.likelyPest,
        confidence: triage.confidence,
        severity: triage.severity,
        urgency: triage.urgency,
        recommendedService: triage.recommendedService,
        estimatedPriceRange: triage.estimatedPriceRange,
        recommendedTimeline: triage.recommendedTimeline,
        safetyConsiderations: triage.safetyConsiderations,
        followUpQuestions: triage.followUpQuestions,
        riskFactors: triage.riskFactors,
        conversionLikelihood: triage.conversionLikelihood,
        guidedAnswersJson: answers.length ? JSON.stringify(answers) : null,
        photosJson: photoUrls.length ? JSON.stringify(photoUrls) : null,
        needsFollowUp,
      },
    });

    assessmentId = created.id;

    await queueTriageRetentionAutomationEvents({
      customerId,
      assessmentId: created.id,
      urgency: triage.urgency,
      severity: triage.severity,
      needsFollowUp,
    });

    await recordAuditEvent({
      actor: customerSession?.email ?? adminSession?.name ?? "system_triage",
      role: customerSession ? "customer" : adminSession?.role ?? "system",
      action: "triage_assessment_created",
      entity: "triage_assessment",
      entityId: created.id,
      after: {
        urgency: created.urgency,
        severity: created.severity,
        needsFollowUp: created.needsFollowUp,
      },
    });
  }

  await routeTriageTranscript({
    sessionId,
    assessmentId,
    customerId,
    message,
    usedFallback: inference.usedFallback,
    severity: triage.severity,
    urgency: triage.urgency,
    conversionLikelihood: triage.conversionLikelihood,
  });

  return NextResponse.json({
    ok: true,
    sessionId,
    persisted: Boolean(assessmentId),
    assessmentId,
    usedFallback: inference.usedFallback,
    triage: triage satisfies TriageAssessmentOutput,
    needsFollowUp,
    requiresHumanReview: needsFollowUp,
    humanReviewReason:
      triage.severity === "critical" || triage.urgency === "immediate"
        ? "critical_risk"
        : confidenceTriggeredHumanReview
          ? "low_confidence"
          : needsFollowUp
            ? "safety_escalation"
            : null,
    humanReviewThreshold,
  });
}