import { buildAccountHomeIntelligence, buildAccountTimelineFeed } from "@/lib/account-home-intelligence";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

function makeSnapshot(overrides?: Partial<CustomerAccountSnapshot>): CustomerAccountSnapshot {
  return {
    customer: {
      id: "customer_1",
      name: "Taylor Quinn",
      email: "taylor@example.com",
      phone: "555-1000",
      city: "Austin",
      addressLine1: "100 Main St",
      addressLine2: null,
      postalCode: "78701",
      stateProvince: "TX",
      activePlan: "annual",
      lifecycle: "active",
      lastServiceDate: new Date("2026-04-10T00:00:00.000Z"),
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
    },
    invoices: [],
    payments: [],
    jobs: [],
    bookings: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as unknown as CustomerAccountSnapshot;
}

describe("account-home-intelligence", () => {
  it("builds chart, timeline, and recommendation surfaces from the existing snapshot", () => {
    const snapshot = makeSnapshot({
      invoices: [
        {
          id: "inv_open",
          amount: 250,
          status: "open",
          billingCycle: "monthly",
          dueDate: new Date("2026-05-20T00:00:00.000Z"),
        },
      ],
      jobs: [
        {
          id: "job_1",
          status: "scheduled",
          service: "Exterior Treatment",
          scheduledAt: new Date("2026-05-18T13:00:00.000Z"),
        },
      ],
      notes: [
        {
          id: "note_1",
          authorType: "customer",
          authorName: "Taylor Quinn",
          body: "Back yard gets wet after rainfall and there is a lot of tree cover near the fence.",
          createdAt: new Date("2026-05-11T00:00:00.000Z"),
        },
      ],
      timeline: [
        {
          id: "timeline_1",
          type: "invoice",
          title: "Invoice open",
          detail: "Monthly plan invoice is awaiting payment.",
          occurredAt: "2026-05-12T00:00:00.000Z",
        },
        {
          id: "timeline_2",
          type: "service",
          title: "Visit scheduled",
          detail: "Exterior treatment window locked in.",
          occurredAt: "2026-05-13T00:00:00.000Z",
        },
      ],
    });

    const intelligence = buildAccountHomeIntelligence(snapshot, new Date("2026-05-13T00:00:00.000Z"));

    expect(intelligence.protectionScore).toBe(89);
    expect(intelligence.protectionTrend).toHaveLength(6);
    expect(intelligence.protectionTrend.at(-1)).toMatchObject({
      label: "Now",
      value: 89,
      emphasis: true,
    });
    expect(intelligence.heatmap.find((item) => item.id === "mosquito")).toMatchObject({
      level: "high",
    });
    expect(intelligence.recommendations[0]).toMatchObject({
      id: "billing",
      priority: "High",
      href: "/account/billing",
    });
    expect(intelligence.timeline.filters).toEqual([
      { id: "all", label: "All", count: 3 },
      { id: "service", label: "Service", count: 1 },
      { id: "billing", label: "Billing", count: 1 },
      { id: "support", label: "Support", count: 0 },
      { id: "ai", label: "AI", count: 1 },
    ]);
  });

  it("lowers protection posture when no service is scheduled and cadence has drifted", () => {
    const snapshot = makeSnapshot({
      customer: {
        ...makeSnapshot().customer,
        lifecycle: "past_due",
        lastServiceDate: new Date("2026-01-01T00:00:00.000Z"),
      },
      timeline: [
        {
          id: "timeline_1",
          type: "note",
          title: "Support follow-up",
          detail: "Customer asked about gaps in service coverage.",
          occurredAt: "2026-05-12T00:00:00.000Z",
        },
      ],
    });

    const intelligence = buildAccountHomeIntelligence(snapshot, new Date("2026-05-13T00:00:00.000Z"));

    expect(intelligence.protectionTone).toBe("danger");
    expect(intelligence.continuityMonths).toBe(1);
    expect(intelligence.recommendations[0]).toMatchObject({
      id: "visit",
      priority: "High",
    });
    expect(intelligence.spotlight).toContain("needs intervention");
  });

  it("groups timeline items into service, billing, support, and ai feed categories", () => {
    const snapshot = makeSnapshot({
      timeline: [
        {
          id: "invoice_1",
          type: "invoice",
          title: "Invoice opened",
          detail: "Monthly charge is awaiting payment.",
          occurredAt: "2026-05-12T00:00:00.000Z",
        },
        {
          id: "payment_1",
          type: "payment",
          title: "Payment received",
          detail: "Card charged successfully.",
          occurredAt: "2026-05-11T00:00:00.000Z",
        },
        {
          id: "note_1",
          type: "note",
          title: "Support guidance posted",
          detail: "Explained billing sequence.",
          occurredAt: "2026-05-10T00:00:00.000Z",
        },
      ],
    });

    const feed = buildAccountTimelineFeed(snapshot);

    expect(feed.filters).toEqual([
      { id: "all", label: "All", count: 4 },
      { id: "service", label: "Service", count: 0 },
      { id: "billing", label: "Billing", count: 2 },
      { id: "support", label: "Support", count: 1 },
      { id: "ai", label: "AI", count: 1 },
    ]);
    expect(feed.items[0]).toMatchObject({
      category: "ai",
      icon: "spark",
    });
    expect(feed.items[1]).toMatchObject({
      category: "billing",
      icon: "receipt",
    });
    expect(feed.items[3]).toMatchObject({
      category: "support",
      icon: "message",
    });
  });

  it("adds triage-informed recommendation and AI timeline category when triage exists", () => {
    const snapshot = makeSnapshot({
      triageAssessments: [
        {
          id: "triage_1",
          customerId: "customer_1",
          serviceBookingId: null,
          source: "triage_engine_v1",
          likelyPest: "Rodent activity",
          confidence: 0.81,
          severity: "high",
          urgency: "urgent",
          recommendedService: "Inspection and targeted treatment plan",
          estimatedPriceRange: "$149-$499",
          recommendedTimeline: "Same day",
          safetyConsiderations: ["Keep children and pets away"],
          followUpQuestions: ["Where is activity highest?"],
          riskFactors: ["Activity may spread"],
          conversionLikelihood: "high",
          guidedAnswersJson: null,
          photosJson: null,
          needsFollowUp: true,
          resolvedAt: null,
          createdAt: new Date("2026-05-12T00:00:00.000Z"),
          updatedAt: new Date("2026-05-12T00:00:00.000Z"),
        },
      ],
      timeline: [
        {
          id: "triage_timeline_1",
          type: "triage",
          title: "Urgent triage signal",
          detail: "Rodent activity",
          occurredAt: "2026-05-12T00:00:00.000Z",
        },
      ],
    });

    const intelligence = buildAccountHomeIntelligence(snapshot, new Date("2026-05-13T00:00:00.000Z"));

    expect(intelligence.recommendations.some((item) => item.id === "triage")).toBe(true);
    expect(intelligence.summary).toContain("Latest AI triage signal");
    expect(intelligence.timeline.filters).toEqual([
      { id: "all", label: "All", count: 2 },
      { id: "service", label: "Service", count: 0 },
      { id: "billing", label: "Billing", count: 0 },
      { id: "support", label: "Support", count: 0 },
      { id: "ai", label: "AI", count: 2 },
    ]);
  });
});