import {
  buildActivityDashboardMetrics,
  buildBillingDashboardMetrics,
  buildServicesDashboardMetrics,
  type DashboardTimelineEntry,
} from "@/lib/account-dashboard-metrics";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

type Tone = "success" | "warning" | "danger" | "info";

export type ChartPoint = {
  label: string;
  value: number;
  emphasis?: boolean;
};

export type HeatmapCell = {
  id: string;
  label: string;
  shortLabel: string;
  level: "low" | "elevated" | "high";
  score: number;
  rationale: string;
};

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Routine";
  confidenceLabel: "High confidence" | "Modeled";
  tone: Tone;
  actionLabel: string;
  href: string;
};

export type TimelineFilter = {
  id: "all" | "service" | "billing" | "support" | "ai";
  label: string;
  count: number;
};

export type TimelineFeedItem = DashboardTimelineEntry & {
  category: TimelineFilter["id"];
  occurredAt: string;
  icon: "shield" | "calendar" | "receipt" | "message" | "spark";
};

const DAY_MS = 1000 * 60 * 60 * 24;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toWholeDays(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

function toTone(score: number): Tone {
  if (score >= 82) {
    return "success";
  }

  if (score >= 66) {
    return "warning";
  }

  return "danger";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not yet scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatRelativeDistance(days: number) {
  if (days <= 7) {
    return "this week";
  }

  if (days <= 21) {
    return "within 3 weeks";
  }

  if (days <= 45) {
    return "within 6 weeks";
  }

  return "beyond the ideal protection cadence";
}

function inferPropertyProfile(snapshot: CustomerAccountSnapshot) {
  const detailPool = [
    snapshot.customer.addressLine1,
    snapshot.customer.addressLine2,
    snapshot.customer.city,
    snapshot.customer.stateProvince,
    ...snapshot.notes.map((note) => note.body),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    wooded: /wood|tree|shade|yard|garden/.test(detailPool),
    moisture: /basement|crawl|drain|gutter|moist|water|rain|pond/.test(detailPool),
    family: /pet|dog|cat|child|family|baby/.test(detailPool),
  };
}

function buildProtectionTrend(score: number, lastServiceDaysAgo: number, openInvoiceCount: number, now: Date): ChartPoint[] {
  const seasonalLift = now.getMonth() >= 4 && now.getMonth() <= 8 ? -4 : 3;
  const recencyPenalty = clamp(Math.floor(lastServiceDaysAgo / 12), 0, 12);
  const billingPenalty = Math.min(10, openInvoiceCount * 3);
  const base = clamp(score - 10 + seasonalLift - billingPenalty, 42, 100);

  return [
    { label: "6m", value: clamp(base - recencyPenalty + 4, 42, 100) },
    { label: "5m", value: clamp(base - recencyPenalty + 2, 42, 100) },
    { label: "4m", value: clamp(base - recencyPenalty, 42, 100) },
    { label: "3m", value: clamp(base + 3, 42, 100) },
    { label: "2m", value: clamp(base + 6, 42, 100) },
    { label: "Now", value: score, emphasis: true },
  ];
}

function buildHeatmap(snapshot: CustomerAccountSnapshot, protectionScore: number, lastServiceDaysAgo: number, now: Date): HeatmapCell[] {
  const profile = inferPropertyProfile(snapshot);
  const warmSeason = now.getMonth() >= 4 && now.getMonth() <= 8;
  const serviceDrift = lastServiceDaysAgo > 45 ? 10 : 0;
  const lowerProtection = protectionScore < 78 ? 8 : 0;

  const cells = [
    {
      id: "ant",
      label: "Ant activity",
      shortLabel: "Ant",
      score: 42 + (warmSeason ? 20 : 8) + (profile.moisture ? 14 : 0) + serviceDrift,
      rationale: profile.moisture
        ? "Moisture signals and seasonal warmth increase exterior foundation pressure."
        : "Seasonal perimeter conditions are the main ant driver right now.",
    },
    {
      id: "mosquito",
      label: "Mosquito pressure",
      shortLabel: "Mosq",
      score: 34 + (warmSeason ? 34 : 6) + (profile.wooded ? 10 : 0) + (profile.moisture ? 10 : 0),
      rationale: warmSeason
        ? "Warm weather and exterior moisture conditions raise mosquito pressure."
        : "Seasonality is reducing mosquito exposure compared with peak months.",
    },
    {
      id: "rodent",
      label: "Rodent risk",
      shortLabel: "Rodent",
      score: 28 + (profile.wooded ? 16 : 4) + lowerProtection,
      rationale: profile.wooded
        ? "Wooded or shaded edges increase rodent approach routes around the home."
        : "Rodent pressure remains mostly tied to perimeter sealing and food sources.",
    },
    {
      id: "termite",
      label: "Termite conditions",
      shortLabel: "Termite",
      score: 22 + (profile.moisture ? 22 : 6) + (warmSeason ? 8 : 2),
      rationale: profile.moisture
        ? "Moisture patterns keep termite conditions elevated near structural touchpoints."
        : "Termite conditions are stable but still worth monitoring around damp zones.",
    },
    {
      id: "moisture",
      label: "Moisture watch",
      shortLabel: "Moisture",
      score: 30 + (profile.moisture ? 28 : 10) + (warmSeason ? 8 : 0),
      rationale: profile.moisture
        ? "Moisture-related risk is an active driver of seasonal pest activity."
        : "No strong moisture indicators were found in the current account record.",
    },
  ];

  return cells.map((cell) => {
    const score = clamp(cell.score, 12, 96);

    return {
      ...cell,
      score,
      level: score >= 72 ? "high" : score >= 46 ? "elevated" : "low",
    };
  });
}

function buildRecommendations(snapshot: CustomerAccountSnapshot, protectionScore: number, nextServiceDate: Date | null, openBalance: number, now: Date): Recommendation[] {
  const upcomingServiceGap = nextServiceDate ? toWholeDays(now, nextServiceDate) : 999;
  const profile = inferPropertyProfile(snapshot);

  const recommendations: Recommendation[] = [
    {
      id: "visit",
      title: nextServiceDate ? "Keep your next perimeter treatment on schedule" : "Book your next protective visit",
      detail: nextServiceDate
        ? `Your next service is ${formatRelativeDistance(upcomingServiceGap)}. Keeping gates clear and exterior access ready will protect service continuity.`
        : "No future visit is currently scheduled. Booking now is the fastest way to recover protection confidence.",
      priority: nextServiceDate && upcomingServiceGap <= 21 ? "Medium" : "High",
      confidenceLabel: "High confidence",
      tone: nextServiceDate && upcomingServiceGap <= 21 ? "info" : "warning",
      actionLabel: nextServiceDate ? "Review visit" : "Schedule service",
      href: "/account/services",
    },
    {
      id: "billing",
      title: openBalance > 0 ? "Resolve open billing to protect continuity" : "Billing posture is supporting uninterrupted coverage",
      detail: openBalance > 0
        ? `Open charges of $${openBalance.toFixed(0)} may create service friction if left unresolved.`
        : "No open balance is currently creating pressure on your protection program.",
      priority: openBalance > 0 ? "High" : "Routine",
      confidenceLabel: "High confidence",
      tone: openBalance > 0 ? "warning" : "success",
      actionLabel: openBalance > 0 ? "Review billing" : "Open plan",
      href: "/account/billing",
    },
    {
      id: "seasonal",
      title: profile.wooded || profile.moisture ? "Reduce exterior activity drivers this month" : "Maintain seasonal prevention habits",
      detail: profile.wooded || profile.moisture
        ? "AI modeling sees elevated outdoor pressure from property conditions and the current season. Clearing standing water and monitoring shaded edges will help."
        : "Seasonal pressure is manageable. Continue standard prevention checks around thresholds, mulch lines, and damp exterior zones.",
      priority: protectionScore < 82 ? "Medium" : "Routine",
      confidenceLabel: "Modeled",
      tone: protectionScore < 82 ? "warning" : "info",
      actionLabel: "See guidance",
      href: "/account/notes",
    },
  ];

  const latestTriage = snapshot.triageAssessments?.[0] ?? null;

  if (latestTriage) {
    recommendations.push({
      id: "triage",
      title: "AI triage follow-up is available",
      detail:
        latestTriage.urgency === "urgent" || latestTriage.urgency === "immediate"
          ? `Latest triage marked ${latestTriage.urgency} urgency for ${latestTriage.likelyPest}. Prioritize immediate scheduling.`
          : `Latest triage suggests ${latestTriage.likelyPest} and recommends ${latestTriage.recommendedTimeline.toLowerCase()}.`,
      priority: latestTriage.urgency === "urgent" || latestTriage.urgency === "immediate" ? "High" : "Medium",
      confidenceLabel: latestTriage.confidence >= 0.7 ? "High confidence" : "Modeled",
      tone: latestTriage.urgency === "urgent" || latestTriage.urgency === "immediate" ? "warning" : "info",
      actionLabel: "Review triage",
      href: "/account",
    });
  }

  return recommendations.sort((left, right) => {
    const order = { High: 0, Medium: 1, Routine: 2 } as const;
    return order[left.priority] - order[right.priority];
  });
}

function mapTimelineCategory(type: CustomerAccountSnapshot["timeline"][number]["type"]): TimelineFeedItem["category"] {
  if (type === "invoice" || type === "payment") {
    return "billing";
  }

  if (type === "triage") {
    return "ai";
  }

  if (type === "note") {
    return "support";
  }

  return "service";
}

function mapTimelineIcon(type: TimelineFeedItem["category"]): TimelineFeedItem["icon"] {
  if (type === "billing") {
    return "receipt";
  }

  if (type === "support") {
    return "message";
  }

  return "shield";
}

export function buildAccountTimelineFeed(snapshot: CustomerAccountSnapshot): { filters: TimelineFilter[]; items: TimelineFeedItem[] } {
  const items: TimelineFeedItem[] = snapshot.timeline.slice(0, 8).map((item) => {
    const category = mapTimelineCategory(item.type);

    return {
      id: item.id,
      title: item.title,
      detail: item.detail,
      badge: category === "billing" ? "Billing" : category === "support" ? "Support" : "Service",
      tone: category === "billing" ? "warning" : category === "support" ? "info" : "success",
      category,
      occurredAt: item.occurredAt,
      icon: mapTimelineIcon(category),
    };
  });

  const aiSummary: TimelineFeedItem = {
    id: "ai-summary",
    title: "AI protection review updated",
    detail: "Property, billing, and seasonal signals were re-evaluated to keep your next best actions current.",
    badge: "AI",
    tone: "info",
    category: "ai",
    occurredAt: new Date().toISOString(),
    icon: "spark",
  };

  const mergedItems = [aiSummary, ...items];
  const counts = mergedItems.reduce<Record<TimelineFilter["id"], number>>(
    (accumulator, item) => {
      accumulator[item.category] += 1;
      accumulator.all += 1;
      return accumulator;
    },
    { all: 0, service: 0, billing: 0, support: 0, ai: 0 },
  );

  return {
    items: mergedItems,
    filters: [
      { id: "all", label: "All", count: counts.all },
      { id: "service", label: "Service", count: counts.service },
      { id: "billing", label: "Billing", count: counts.billing },
      { id: "support", label: "Support", count: counts.support },
      { id: "ai", label: "AI", count: counts.ai },
    ],
  };
}

export function buildAccountHomeIntelligence(snapshot: CustomerAccountSnapshot, now = new Date()) {
  const services = buildServicesDashboardMetrics(snapshot, now);
  const billing = buildBillingDashboardMetrics(snapshot);
  const activity = buildActivityDashboardMetrics(snapshot);
  const lastServiceDate = snapshot.customer.lastServiceDate;
  const lastServiceDaysAgo = lastServiceDate ? toWholeDays(lastServiceDate, now) : 999;
  const nextVisit = services.nextVisit as { scheduledAt?: Date; preferredDate?: Date } | null;
  const nextServiceDate = nextVisit?.scheduledAt ?? nextVisit?.preferredDate ?? null;

  const servicePenalty = Math.min(30, Math.floor(lastServiceDaysAgo / 6));
  const scorePenaltyFromInvoices = Math.min(20, billing.openInvoices.length * 6);
  const lifecyclePenalty = snapshot.customer.lifecycle === "past_due" ? 18 : 0;
  const latestTriage = snapshot.triageAssessments?.[0] ?? null;
  const triagePenalty = latestTriage && (latestTriage.urgency === "urgent" || latestTriage.urgency === "immediate") ? 6 : 0;
  const protectionScore = Math.max(42, 100 - servicePenalty - scorePenaltyFromInvoices - lifecyclePenalty - triagePenalty);
  const protectionTone = toTone(protectionScore);
  const profile = inferPropertyProfile(snapshot);
  const warmSeason = now.getMonth() >= 4 && now.getMonth() <= 8;
  const activeRiskHeadline = warmSeason ? "Mosquito pressure elevated" : "Perimeter stability active";
  const summary = warmSeason
    ? `Recent seasonal conditions may increase exterior pest activity${profile.moisture ? " around moisture-prone edges" : " near your perimeter"}. ${billing.openInvoices.length > 0 ? "Open billing items could create service interruptions if left unresolved." : "Your current plan posture is keeping protection continuity stable."}`
    : `${lastServiceDaysAgo > 60 ? "Protection confidence is softening because your last treatment is aging out of the preferred cadence." : "Protection coverage remains steady with current service recency and account status."} ${profile.wooded ? "Wooded property signals slightly increase outdoor exposure this cycle." : "Seasonal exposure appears stable this cycle."}`;
  const triageSummary = latestTriage
    ? ` Latest AI triage signal: ${latestTriage.likelyPest} (${Math.round(latestTriage.confidence * 100)}% confidence, ${latestTriage.urgency} urgency).`
    : "";

  const spotlight = protectionScore >= 82
    ? "Your home is operating inside a strong protection envelope."
    : protectionScore >= 66
      ? "Your protection system is stable, but a few signals need attention."
      : "Your protection system needs intervention to restore full confidence.";

  const timeline = buildAccountTimelineFeed(snapshot);
  const continuityMonths = lastServiceDate
    ? lastServiceDaysAgo > 75
      ? 1
      : Math.max(1, Math.round((210 - Math.min(180, lastServiceDaysAgo)) / 30))
    : 0;

  return {
    protectionScore,
    protectionTone,
    activeRiskHeadline,
    spotlight,
    summary: `${summary}${triageSummary}`,
    nextServiceDate,
    nextServiceLabel: formatDate(nextServiceDate),
    lastServiceDate,
    lastServiceDaysAgo,
    continuityMonths,
    trustScore: clamp(Math.round((billing.billingConfidenceScore + services.visitHealthScore + activity.timelineDepthScore) / 3), 42, 100),
    protectionTrend: buildProtectionTrend(protectionScore, lastServiceDaysAgo, billing.openInvoices.length, now),
    heatmap: buildHeatmap(snapshot, protectionScore, lastServiceDaysAgo, now),
    recommendations: buildRecommendations(snapshot, protectionScore, nextServiceDate, billing.openBalance, now),
    timeline,
  };
}

export type AccountHomeIntelligence = ReturnType<typeof buildAccountHomeIntelligence>;