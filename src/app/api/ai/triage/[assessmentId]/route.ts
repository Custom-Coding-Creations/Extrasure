import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { isTriageEnabled } from "@/lib/triage-runtime";

export async function GET(_request: NextRequest, context: { params: Promise<{ assessmentId: string }> }) {
  if (!isTriageEnabled()) {
    return NextResponse.json({ error: "Triage is temporarily unavailable" }, { status: 503 });
  }

  const { assessmentId } = await context.params;
  const customerSession = await requireCustomerApiSession();
  const adminSession = await requireAdminApiSession();

  if (!customerSession && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assessment = await prisma.triageAssessment.findUnique({
    where: {
      id: assessmentId,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (customerSession && assessment.customerId !== customerSession.customerId && !adminSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    assessment: {
      ...assessment,
      guidedAnswers: assessment.guidedAnswersJson ? JSON.parse(assessment.guidedAnswersJson) : [],
      photos: assessment.photosJson ? JSON.parse(assessment.photosJson) : [],
    },
  });
}