import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

export type DashboardTimelineEntry = {
  id: string;
  title: string;
  detail: string;
  badge: string;
  tone: "success" | "warning" | "danger" | "info";
};

export type DashboardAssuranceEntry = {
  id: string;
  title: string;
  detail: string;
};

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function bookingTone(status: string): DashboardTimelineEntry["tone"] {
  if (status === "confirmed" || status === "scheduled") {
    return "success";
  }

  if (status === "checkout_pending") {
    return "warning";
  }

  return "info";
}

function jobTone(status: string): DashboardTimelineEntry["tone"] {
  if (status === "completed") {
    return "success";
  }

  if (status === "scheduled" || status === "in_progress") {
    return "warning";
  }

  return "info";
}

type TimelineType = "invoice" | "payment" | "service" | "booking" | "note" | "triage";

const eventToneMap: Record<TimelineType, DashboardTimelineEntry["tone"]> = {
  invoice: "warning",
  payment: "success",
  service: "info",
  booking: "info",
  note: "info",
  triage: "info",
};

const eventLabelMap: Record<TimelineType, string> = {
  invoice: "Billing",
  payment: "Payment",
  service: "Service",
  booking: "Booking",
  note: "Support",
  triage: "Triage",
};

export function buildServicesDashboardMetrics(snapshot: CustomerAccountSnapshot, now = new Date()) {
  const upcomingBookings = snapshot.bookings
    .filter((booking) => booking.preferredDate.getTime() >= now.getTime())
    .sort((a, b) => a.preferredDate.getTime() - b.preferredDate.getTime());
  const recentJobs = [...snapshot.jobs].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  const nextVisit = recentJobs.find((job) => job.scheduledAt.getTime() >= now.getTime()) ?? upcomingBookings[0] ?? null;
  const completedVisitsCount = recentJobs.filter((job) => job.status === "completed").length;
  const overdueIncompleteVisitsCount = recentJobs.filter((job) => job.status !== "completed" && job.scheduledAt.getTime() < now.getTime()).length;

  const visitHealthScore = Math.max(
    44,
    100 - Math.min(38, upcomingBookings.length === 0 && !nextVisit ? 35 : 0) - Math.min(25, overdueIncompleteVisitsCount * 10),
  );

  const timelineEvents: DashboardTimelineEntry[] = (nextVisit ? [nextVisit] : snapshot.bookings)
    .slice(0, 4)
    .map((event, index) => ({
      id: `visit-event-${event.id}`,
      title:
        "service" in event
          ? `${event.service} ${index === 0 ? "window" : "checkpoint"}`
          : `Requested visit ${index === 0 ? "window" : "queue"}`,
      detail:
        "service" in event
          ? `${formatDateTime(event.scheduledAt)} - Technician route status: ${humanize(event.status)}.`
          : `${formatDate(event.preferredDate)} (${event.preferredWindow}) - ${event.addressLine1}, ${event.city}.`,
      badge: humanize(event.status),
      tone: "service" in event ? jobTone(event.status) : bookingTone(event.status),
    }));

  const readinessAssurance: DashboardAssuranceEntry[] = [
    {
      id: "access",
      title: "Access certainty",
      detail: "Gate and entry guidance are tracked to reduce missed technician windows.",
    },
    {
      id: "safety",
      title: "Safety-first preparation",
      detail: "Family and pet-safe prep reminders are embedded before each visit.",
    },
    {
      id: "continuity",
      title: "Continuity checks",
      detail: "Schedule drift and cancellation patterns are monitored for coverage continuity.",
    },
  ];

  return {
    upcomingBookings,
    recentJobs,
    nextVisit,
    completedVisitsCount,
    visitHealthScore,
    timelineEvents,
    readinessAssurance,
  };
}

export function buildActivityDashboardMetrics(snapshot: CustomerAccountSnapshot) {
  const timelineDepthScore = Math.max(40, Math.min(100, 52 + snapshot.timeline.length * 4));
  const summarizedEvents: DashboardTimelineEntry[] = snapshot.timeline.slice(0, 5).map((item) => ({
    id: `timeline-${item.id}`,
    title: item.title,
    detail: item.detail,
    badge: eventLabelMap[item.type],
    tone: eventToneMap[item.type],
  }));

  const timelineAssurance: DashboardAssuranceEntry[] = [
    {
      id: "traceability",
      title: "Unified traceability",
      detail: "Service, billing, and support records are preserved in a single event stream.",
    },
    {
      id: "clarity",
      title: "Readable event labels",
      detail: "Each record is classified so operational context stays clear during support calls.",
    },
    {
      id: "audit",
      title: "Audit-friendly history",
      detail: "Milestones are timestamped for dependable historical reconstruction.",
    },
  ];

  return {
    timelineDepthScore,
    summarizedEvents,
    timelineAssurance,
    eventsLoggedCount: snapshot.timeline.length,
    serviceEventsCount: snapshot.timeline.filter((entry) => entry.type === "service" || entry.type === "booking").length,
    billingEventsCount: snapshot.timeline.filter((entry) => entry.type === "invoice" || entry.type === "payment").length,
  };
}

export function buildInvoicesDashboardMetrics(snapshot: CustomerAccountSnapshot) {
  const paidInvoices = snapshot.invoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== "paid");
  const lifetimeValue = snapshot.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const billingStabilityScore = Math.max(38, 100 - Math.min(42, openInvoices.length * 14));

  const invoiceTimeline: DashboardTimelineEntry[] = snapshot.invoices.slice(0, 5).map((invoice) => ({
    id: `invoice-${invoice.id}`,
    title: `${formatCurrency(invoice.amount)} invoice`,
    detail: `Due ${formatDate(invoice.dueDate)} - ${cycleLabel(invoice.billingCycle)} billing cycle.`,
    badge: invoice.status.replace("_", " "),
    tone: invoiceTone(invoice.status),
  }));

  const billingAssurance: DashboardAssuranceEntry[] = [
    {
      id: "documents",
      title: "Stripe document parity",
      detail: "Hosted invoice and PDF links are surfaced whenever Stripe provides them.",
    },
    {
      id: "classification",
      title: "Charge classification",
      detail: "Invoice status and billing cycle labels stay visible for support clarity.",
    },
    {
      id: "continuity",
      title: "Continuity tracking",
      detail: "Open balances are highlighted to prevent service interruptions.",
    },
  ];

  return {
    paidInvoices,
    openInvoices,
    lifetimeValue,
    billingStabilityScore,
    invoiceTimeline,
    billingAssurance,
  };
}

export function buildProfileDashboardMetrics(snapshot: CustomerAccountSnapshot) {
  const addressSummary = [
    snapshot.customer.addressLine1,
    snapshot.customer.addressLine2,
    snapshot.customer.city,
    snapshot.customer.stateProvince,
    snapshot.customer.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const lastServiceDate = snapshot.customer.lastServiceDate;

  const propertyInsights = [
    {
      id: "seasonal",
      tone: lastServiceDate ? ("info" as const) : ("warning" as const),
      title: lastServiceDate ? "Monitoring active" : "First visit still needed",
      detail:
        lastServiceDate
          ? "Your property profile is active in the ExtraSure protection system and ready for the next recommended visit window."
          : "No completed service is recorded yet. Scheduling your first visit will improve property-specific recommendations.",
    },
    {
      id: "environment",
      tone: "warning" as const,
      title: "Exterior watchpoints",
      detail: "Entry thresholds, damp perimeter edges, and shaded exterior zones should remain priority monitoring areas for seasonal activity.",
    },
    {
      id: "trust",
      tone: "success" as const,
      title: "Trust and safety readiness",
      detail: "Your account has the core contact and property details needed for technician routing, visit preparation, and treatment safety guidance.",
    },
  ];

  const profileReadinessScore = Math.max(
    46,
    100 - (snapshot.customer.addressLine1 ? 0 : 22) - (snapshot.customer.phone ? 0 : 20) - (lastServiceDate ? 0 : 12),
  );

  const profileTimeline: DashboardTimelineEntry[] = [
    {
      id: "identity",
      title: "Identity and contact profile",
      detail: `${snapshot.customer.name} - ${snapshot.customer.phone || "Phone pending"} - ${snapshot.customer.city}`,
      badge: snapshot.customer.phone ? "Ready" : "Needs phone",
      tone: snapshot.customer.phone ? "success" : "warning",
    },
    {
      id: "property",
      title: "Property routing record",
      detail: addressSummary || "Add property address details for reliable technician routing.",
      badge: snapshot.customer.addressLine1 ? "Mapped" : "Address needed",
      tone: snapshot.customer.addressLine1 ? "info" : "warning",
    },
    {
      id: "service-history",
      title: "Service history baseline",
      detail: lastServiceDate
        ? `Last recorded service: ${formatDate(lastServiceDate)}.`
        : "No completed service is recorded yet.",
      badge: lastServiceDate ? "Active history" : "New profile",
      tone: lastServiceDate ? "success" : "warning",
    },
  ];

  const trustItems: DashboardAssuranceEntry[] = [
    {
      id: "routing",
      title: "Routing integrity",
      detail: "Technician dispatch quality depends on accurate property and access details.",
    },
    {
      id: "safety",
      title: "Safety communication",
      detail: "Visit preparation and treatment safety notes are tailored from your profile details.",
    },
    {
      id: "support",
      title: "Support coherence",
      detail: "Billing and service context remain connected for faster support resolution.",
    },
  ];

  return {
    lastServiceDate,
    addressSummary,
    propertyInsights,
    profileReadinessScore,
    profileTimeline,
    trustItems,
  };
}

export function buildBillingDashboardMetrics(snapshot: CustomerAccountSnapshot) {
  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== "paid");
  const openBalance = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const lastInvoice = [...snapshot.invoices].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())[0] ?? null;
  const lastPayment = [...snapshot.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  const billingConfidenceScore = Math.max(
    42,
    100 - Math.min(45, openInvoices.length * 14) - (snapshot.customer.stripeSubscriptionStatus?.includes("past_due") ? 18 : 0),
  );

  const billingTimeline: DashboardTimelineEntry[] = snapshot.invoices.slice(0, 5).map((invoice) => ({
    id: `billing-${invoice.id}`,
    title: `${formatCurrency(invoice.amount)} invoice checkpoint`,
    detail: `${invoice.billingCycle.replace("_", " ")} cycle - due ${formatDate(invoice.dueDate)}.`,
    badge: invoice.status.replace("_", " "),
    tone: invoice.status === "paid" ? "success" : invoice.status === "open" ? "warning" : "info",
  }));

  const billingAssurance: DashboardAssuranceEntry[] = [
    {
      id: "control",
      title: "Control over plan cadence",
      detail: "Pause, resume, and cancellation actions are available without losing historical transparency.",
    },
    {
      id: "continuity",
      title: "Continuity monitoring",
      detail: "Open balances and recurring status signals are surfaced together to avoid service disruption.",
    },
    {
      id: "clarity",
      title: "Charge clarity",
      detail: "Billing records, AI guidance, and support channels stay aligned for faster decisions.",
    },
  ];

  return {
    openInvoices,
    openBalance,
    lastInvoice,
    lastPayment,
    billingConfidenceScore,
    billingTimeline,
    billingAssurance,
  };
}

export function buildNotesDashboardMetrics(snapshot: CustomerAccountSnapshot) {
  const supportSignalScore = Math.max(45, Math.min(100, 56 + Math.min(8, snapshot.notes.length) * 5));

  const supportTimeline: DashboardTimelineEntry[] = snapshot.notes.slice(0, 5).map((note) => ({
    id: `note-${note.id}`,
    title: note.authorType === "customer" ? "Customer request recorded" : "Support guidance posted",
    detail: note.body.length > 130 ? `${note.body.slice(0, 130)}...` : note.body,
    badge: note.authorType === "customer" ? "You" : "Support",
    tone: note.authorType === "customer" ? "info" : "success",
  }));

  const supportAssurance: DashboardAssuranceEntry[] = [
    {
      id: "context",
      title: "Context-aware responses",
      detail: "Support prompts are tied to your account timeline so replies stay relevant.",
    },
    {
      id: "visibility",
      title: "Visible conversation record",
      detail: "Customer and support messages remain auditable in one thread.",
    },
    {
      id: "escalation",
      title: "Escalation pathways",
      detail: "Urgent protection concerns can be escalated with actionable context.",
    },
  ];

  return {
    supportSignalScore,
    supportTimeline,
    supportAssurance,
  };
}

function cycleLabel(value: string) {
  return value.replace("_", " ");
}

function invoiceTone(status: string): DashboardTimelineEntry["tone"] {
  if (status === "paid") {
    return "success";
  }

  if (status === "open") {
    return "warning";
  }

  if (status.includes("void") || status.includes("failed") || status.includes("uncollectible")) {
    return "danger";
  }

  return "info";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
