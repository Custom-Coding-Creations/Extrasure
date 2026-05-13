import {
  buildActivityDashboardMetrics,
  buildBillingDashboardMetrics,
  buildInvoicesDashboardMetrics,
  buildNotesDashboardMetrics,
  buildProfileDashboardMetrics,
  buildServicesDashboardMetrics,
} from "@/lib/account-dashboard-metrics";
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
      lastServiceDate: null,
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

describe("account-dashboard-metrics", () => {
  it("builds billing metrics including confidence score and timeline", () => {
    const snapshot = makeSnapshot({
      customer: {
        ...makeSnapshot().customer,
        stripeSubscriptionStatus: "past_due",
      },
      invoices: [
        {
          id: "inv_open",
          amount: 250,
          status: "open",
          billingCycle: "monthly",
          dueDate: new Date("2026-05-10T00:00:00.000Z"),
        },
        {
          id: "inv_paid",
          amount: 180,
          status: "paid",
          billingCycle: "monthly",
          dueDate: new Date("2026-04-10T00:00:00.000Z"),
        },
      ],
      payments: [
        {
          id: "pay_1",
          amount: 180,
          createdAt: new Date("2026-04-09T00:00:00.000Z"),
        },
      ],
    });

    const metrics = buildBillingDashboardMetrics(snapshot);

    expect(metrics.openInvoices).toHaveLength(1);
    expect(metrics.openBalance).toBe(250);
    expect(metrics.lastInvoice?.id).toBe("inv_open");
    expect(metrics.lastPayment?.id).toBe("pay_1");
    expect(metrics.billingConfidenceScore).toBe(68);
    expect(metrics.billingTimeline).toHaveLength(2);
    expect(metrics.billingTimeline[0]).toMatchObject({
      id: "billing-inv_open",
      badge: "open",
      tone: "warning",
    });
    expect(metrics.billingAssurance).toHaveLength(3);
  });

  it("builds support metrics with capped score and truncated timeline details", () => {
    const longBody = "x".repeat(180);

    const snapshot = makeSnapshot({
      notes: [
        {
          id: "note_1",
          authorType: "customer",
          body: longBody,
          createdAt: new Date("2026-05-10T00:00:00.000Z"),
        },
        {
          id: "note_2",
          authorType: "admin",
          body: "Please confirm gate access details for your next treatment window.",
          createdAt: new Date("2026-05-09T00:00:00.000Z"),
        },
      ],
    });

    const metrics = buildNotesDashboardMetrics(snapshot);

    expect(metrics.supportSignalScore).toBe(66);
    expect(metrics.supportTimeline).toHaveLength(2);
    expect(metrics.supportTimeline[0]).toMatchObject({
      id: "note-note_1",
      badge: "You",
      tone: "info",
    });
    expect(metrics.supportTimeline[0]?.detail.endsWith("...")).toBe(true);
    expect(metrics.supportTimeline[1]).toMatchObject({
      id: "note-note_2",
      badge: "Support",
      tone: "success",
    });
    expect(metrics.supportAssurance).toHaveLength(3);
  });

  it("builds services metrics from upcoming bookings and recent jobs", () => {
    const snapshot = makeSnapshot({
      jobs: [
        {
          id: "job_cancelled",
          status: "in_progress",
          service: "Exterior Treatment",
          scheduledAt: new Date("2026-05-14T10:00:00.000Z"),
        },
      ],
      bookings: [
        {
          id: "booking_1",
          status: "scheduled",
          preferredDate: new Date("2026-05-20T09:00:00.000Z"),
          preferredWindow: "Morning",
          addressLine1: "100 Main St",
          city: "Austin",
        },
      ],
    });

    const metrics = buildServicesDashboardMetrics(snapshot, new Date("2026-05-13T00:00:00.000Z"));

    expect(metrics.nextVisit?.id).toBe("job_cancelled");
    expect(metrics.completedVisitsCount).toBe(0);
    expect(metrics.visitHealthScore).toBe(100);
    expect(metrics.timelineEvents[0]).toMatchObject({
      id: "visit-event-job_cancelled",
      badge: "In Progress",
      tone: "warning",
    });
    expect(metrics.readinessAssurance).toHaveLength(3);
  });

  it("builds activity metrics including counts and summarized events", () => {
    const snapshot = makeSnapshot({
      timeline: [
        { id: "t1", type: "invoice", title: "Invoice open", detail: "Open", occurredAt: "2026-05-12T00:00:00.000Z" },
        { id: "t2", type: "payment", title: "Payment received", detail: "Paid", occurredAt: "2026-05-11T00:00:00.000Z" },
        { id: "t3", type: "service", title: "Visit completed", detail: "Done", occurredAt: "2026-05-10T00:00:00.000Z" },
      ],
    });

    const metrics = buildActivityDashboardMetrics(snapshot);

    expect(metrics.timelineDepthScore).toBe(64);
    expect(metrics.eventsLoggedCount).toBe(3);
    expect(metrics.billingEventsCount).toBe(2);
    expect(metrics.serviceEventsCount).toBe(1);
    expect(metrics.summarizedEvents[0]).toMatchObject({
      id: "timeline-t1",
      badge: "Billing",
      tone: "warning",
    });
  });

  it("builds invoices and profile metrics", () => {
    const snapshot = makeSnapshot({
      customer: {
        ...makeSnapshot().customer,
        addressLine1: null,
        phone: "",
      },
      invoices: [
        {
          id: "inv_1",
          amount: 120,
          status: "paid",
          billingCycle: "monthly",
          dueDate: new Date("2026-05-06T00:00:00.000Z"),
        },
        {
          id: "inv_2",
          amount: 95,
          status: "open",
          billingCycle: "one_time",
          dueDate: new Date("2026-05-12T00:00:00.000Z"),
        },
      ],
    });

    const invoiceMetrics = buildInvoicesDashboardMetrics(snapshot);
    const profileMetrics = buildProfileDashboardMetrics(snapshot);

    expect(invoiceMetrics.paidInvoices).toHaveLength(1);
    expect(invoiceMetrics.openInvoices).toHaveLength(1);
    expect(invoiceMetrics.lifetimeValue).toBe(215);
    expect(invoiceMetrics.billingStabilityScore).toBe(86);
    expect(invoiceMetrics.invoiceTimeline[1]).toMatchObject({
      id: "invoice-inv_2",
      tone: "warning",
    });

    expect(profileMetrics.addressSummary).toContain("Austin");
    expect(profileMetrics.profileReadinessScore).toBe(46);
    expect(profileMetrics.profileTimeline[0]).toMatchObject({
      id: "identity",
      badge: "Needs phone",
      tone: "warning",
    });
    expect(profileMetrics.trustItems).toHaveLength(3);
  });
});
