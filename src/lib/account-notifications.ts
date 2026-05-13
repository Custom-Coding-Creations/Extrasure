import "server-only";

import { randomUUID } from "node:crypto";
import type { AccountShellNotification } from "@/components/account/account-shell-types";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";
import { prisma } from "@/lib/prisma";

const DAY_MS = 1000 * 60 * 60 * 24;
const HOUR_MS = 1000 * 60 * 60;

export const ACCOUNT_NOTIFICATION_PREFERENCE_DEFINITIONS = [
  {
    sourceKey: "protection_risk",
    label: "Protection risk alerts",
    detail: "Notify when protection score or lifecycle signals suggest follow-up is needed.",
  },
  {
    sourceKey: "billing_open_balance",
    label: "Billing balance alerts",
    detail: "Notify when open balances might impact billing continuity.",
  },
  {
    sourceKey: "visit_missing",
    label: "Visit scheduling alerts",
    detail: "Notify when no upcoming visit is scheduled.",
  },
  {
    sourceKey: "profile_incomplete",
    label: "Profile completeness alerts",
    detail: "Notify when property profile details are incomplete.",
  },
  {
    sourceKey: "triage_high_risk",
    label: "High-risk triage alerts",
    detail: "Notify when AI triage indicates high urgency or elevated safety risk.",
  },
  {
    sourceKey: "triage_follow_up",
    label: "Triage follow-up reminders",
    detail: "Notify when unresolved triage assessments need follow-up actions.",
  },
] as const;

const ACCOUNT_NOTIFICATION_SOURCE_CONFIG = {
  protection_risk: { expiresAfterDays: 14 },
  billing_open_balance: { expiresAfterDays: 14 },
  visit_missing: { expiresAfterDays: 10 },
  profile_incomplete: { expiresAfterDays: 30 },
  triage_high_risk: { expiresAfterDays: 5 },
  triage_follow_up: { expiresAfterDays: 7 },
  account_healthy: { expiresAfterDays: 2 },
} as const;

type AccountNotificationPreferenceSourceKey = (typeof ACCOUNT_NOTIFICATION_PREFERENCE_DEFINITIONS)[number]["sourceKey"];

type AccountNotificationPreferenceItem = {
  sourceKey: AccountNotificationPreferenceSourceKey;
  label: string;
  detail: string;
  enabled: boolean;
};

type PersistedNotificationCandidate = Omit<AccountShellNotification, "id" | "createdAt" | "readAt"> & {
  sourceKey: AccountNotificationPreferenceSourceKey | "account_healthy";
};

function getExpiryDateForSource(sourceKey: keyof typeof ACCOUNT_NOTIFICATION_SOURCE_CONFIG) {
  return new Date(Date.now() + ACCOUNT_NOTIFICATION_SOURCE_CONFIG[sourceKey].expiresAfterDays * DAY_MS);
}

function isKnownPreferenceSourceKey(sourceKey: string): sourceKey is AccountNotificationPreferenceSourceKey {
  return ACCOUNT_NOTIFICATION_PREFERENCE_DEFINITIONS.some((item) => item.sourceKey === sourceKey);
}

function getDefaultPreferenceMap() {
  return new Map(ACCOUNT_NOTIFICATION_PREFERENCE_DEFINITIONS.map((item) => [item.sourceKey, true]));
}

async function getCustomerPreferenceEnabledMap(customerId: string) {
  const preferenceMap = getDefaultPreferenceMap();
  const storedPreferences = await prisma.customerNotificationPreference.findMany({
    where: {
      customerId,
    },
  });

  for (const preference of storedPreferences) {
    if (isKnownPreferenceSourceKey(preference.sourceKey)) {
      preferenceMap.set(preference.sourceKey, preference.enabled);
    }
  }

  return preferenceMap;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildPersistedNotificationCandidates(snapshot: CustomerAccountSnapshot, preferenceMap: Map<AccountNotificationPreferenceSourceKey, boolean>): PersistedNotificationCandidate[] {
  const now = new Date();
  const lastServiceDate = snapshot.customer.lastServiceDate;
  const lastServiceDaysAgo = lastServiceDate ? Math.max(0, Math.round((now.getTime() - lastServiceDate.getTime()) / DAY_MS)) : 999;
  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== "paid");
  const openBalance = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const upcomingBookings = snapshot.bookings
    .filter((booking) => booking.preferredDate.getTime() >= now.getTime())
    .sort((a, b) => a.preferredDate.getTime() - b.preferredDate.getTime());
  const futureJob = [...snapshot.jobs]
    .filter((job) => job.scheduledAt.getTime() >= now.getTime())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
  const nextVisit = futureJob ?? upcomingBookings[0] ?? null;
  const latestTriage = snapshot.triageAssessments?.[0] ?? null;
  const protectionScore = Math.max(
    42,
    100 - Math.min(30, Math.floor(lastServiceDaysAgo / 6)) - Math.min(20, openInvoices.length * 6) - (snapshot.customer.lifecycle === "past_due" ? 18 : 0),
  );

  const candidates: PersistedNotificationCandidate[] = [];

  if (protectionScore < 82 && preferenceMap.get("protection_risk")) {
    candidates.push({
      sourceKey: "protection_risk",
      tone: "warning",
      title: protectionScore < 66 ? "Protection follow-up needed" : "Protection watchlist active",
      detail:
        protectionScore < 66
          ? "Your account signals suggest urgent follow-up on service cadence or billing continuity."
          : "A few account signals need attention to keep your home fully protected.",
      href: "/account",
    });
  }

  if (openInvoices.length && preferenceMap.get("billing_open_balance")) {
    candidates.push({
      sourceKey: "billing_open_balance",
      tone: "warning",
      title: "Outstanding balance needs review",
      detail: `${formatCurrency(openBalance)} remains open across ${openInvoices.length} billing item${openInvoices.length > 1 ? "s" : ""}.`,
      href: "/account/billing",
    });
  }

  if (!nextVisit && preferenceMap.get("visit_missing")) {
    candidates.push({
      sourceKey: "visit_missing",
      tone: "warning",
      title: "No protection visit is scheduled",
      detail: "Book your next visit to restore proactive protection coverage and treatment cadence.",
      href: "/account/services",
    });
  }

  if (!snapshot.customer.addressLine1 && preferenceMap.get("profile_incomplete")) {
    candidates.push({
      sourceKey: "profile_incomplete",
      tone: "info",
      title: "Property profile is still incomplete",
      detail: "Add your street address to improve technician routing and service prep guidance.",
      href: "/account/profile",
    });
  }

  if (
    latestTriage &&
    (latestTriage.urgency === "urgent" || latestTriage.urgency === "immediate" || latestTriage.severity === "high" || latestTriage.severity === "critical") &&
    preferenceMap.get("triage_high_risk")
  ) {
    candidates.push({
      sourceKey: "triage_high_risk",
      tone: "warning",
      title: "High-risk triage signal detected",
      detail: `AI triage flagged ${latestTriage.likelyPest} with ${latestTriage.urgency} urgency.`,
      href: "/account",
    });
  }

  if (latestTriage?.needsFollowUp && preferenceMap.get("triage_follow_up")) {
    candidates.push({
      sourceKey: "triage_follow_up",
      tone: "info",
      title: "Triage follow-up recommended",
      detail: "Your latest AI triage assessment still needs follow-up confirmation.",
      href: "/account",
    });
  }

  if (!candidates.length) {
    candidates.push({
      sourceKey: "account_healthy",
      tone: "success",
      title: "Protection program looks on track",
      detail: "Billing, service cadence, and property readiness are all in a stable range right now.",
      href: "/account",
    });
  }

  return candidates;
}

function mapPersistedNotification(record: {
  id: string;
  tone: "info" | "warning" | "success";
  title: string;
  detail: string;
  href: string;
  createdAt: Date;
  readAt: Date | null;
  snoozedUntil: Date | null;
  expiresAt: Date | null;
}) {
  return {
    id: record.id,
    tone: record.tone,
    title: record.title,
    detail: record.detail,
    href: record.href,
    createdAt: record.createdAt.toISOString(),
    readAt: record.readAt?.toISOString() ?? null,
    snoozedUntil: record.snoozedUntil?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
  } satisfies AccountShellNotification;
}

export async function syncCustomerAccountNotifications(snapshot: CustomerAccountSnapshot) {
  const customerId = snapshot.customer.id;
  const preferenceMap = await getCustomerPreferenceEnabledMap(customerId);
  const candidates = buildPersistedNotificationCandidates(snapshot, preferenceMap);
  const existing = await prisma.customerAccountNotification.findMany({
    where: { customerId },
  });
  const existingBySourceKey = new Map(existing.map((item) => [item.sourceKey, item]));

  for (const candidate of candidates) {
    const match = existingBySourceKey.get(candidate.sourceKey);

    if (match) {
      await prisma.customerAccountNotification.update({
        where: { id: match.id },
        data: {
          tone: candidate.tone,
          title: candidate.title,
          detail: candidate.detail,
          href: candidate.href,
          resolvedAt: null,
          expiresAt: getExpiryDateForSource(candidate.sourceKey),
          ...(match.resolvedAt
            ? {
                dismissedAt: null,
                readAt: null,
                snoozedUntil: null,
              }
            : {}),
        },
      });

      continue;
    }

    await prisma.customerAccountNotification.create({
      data: {
        id: `acct_notification_${randomUUID()}`,
        customerId,
        sourceKey: candidate.sourceKey,
        tone: candidate.tone,
        title: candidate.title,
        detail: candidate.detail,
        href: candidate.href,
        expiresAt: getExpiryDateForSource(candidate.sourceKey),
      },
    });
  }

  const activeSourceKeys = new Set<string>(candidates.map((candidate) => candidate.sourceKey));
  const staleNotificationIds = existing
    .filter((item) => item.resolvedAt === null && !activeSourceKeys.has(item.sourceKey))
    .map((item) => item.id);

  if (staleNotificationIds.length) {
    await prisma.customerAccountNotification.updateMany({
      where: {
        id: {
          in: staleNotificationIds,
        },
      },
      data: {
        resolvedAt: new Date(),
        snoozedUntil: null,
      },
    });
  }
}

export async function listActiveCustomerAccountNotifications(customerId: string) {
  const now = new Date();
  const notifications = await prisma.customerAccountNotification.findMany({
    where: {
      customerId,
      dismissedAt: null,
      resolvedAt: null,
      OR: [
        {
          snoozedUntil: null,
        },
        {
          snoozedUntil: {
            lte: now,
          },
        },
      ],
      AND: [
        {
          OR: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                gt: now,
              },
            },
          ],
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 8,
  });

  return notifications
    .sort((left, right) => {
      const unreadDelta = Number(Boolean(left.readAt)) - Number(Boolean(right.readAt));

      if (unreadDelta !== 0) {
        return unreadDelta;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .map(mapPersistedNotification);
}

export async function getPersistedAccountNotificationsForSnapshot(snapshot: CustomerAccountSnapshot) {
  await syncCustomerAccountNotifications(snapshot);
  return listActiveCustomerAccountNotifications(snapshot.customer.id);
}

export async function markAllCustomerAccountNotificationsRead(customerId: string) {
  const now = new Date();

  await prisma.customerAccountNotification.updateMany({
    where: {
      customerId,
      dismissedAt: null,
      resolvedAt: null,
      readAt: null,
    },
    data: {
      readAt: now,
    },
  });
}

export async function dismissCustomerAccountNotification(customerId: string, notificationId: string) {
  const now = new Date();
  const result = await prisma.customerAccountNotification.updateMany({
    where: {
      id: notificationId,
      customerId,
      resolvedAt: null,
      dismissedAt: null,
    },
    data: {
      dismissedAt: now,
      readAt: now,
    },
  });

  return result.count > 0;
}

export async function snoozeCustomerAccountNotification(customerId: string, notificationId: string, snoozeHours: number) {
  if (!Number.isFinite(snoozeHours) || snoozeHours <= 0) {
    return false;
  }

  const now = new Date();
  const snoozedUntil = new Date(now.getTime() + Math.round(snoozeHours) * HOUR_MS);
  const result = await prisma.customerAccountNotification.updateMany({
    where: {
      id: notificationId,
      customerId,
      resolvedAt: null,
      dismissedAt: null,
    },
    data: {
      snoozedUntil,
      readAt: now,
    },
  });

  return result.count > 0;
}

export async function getCustomerAccountNotificationPreferences(customerId: string): Promise<AccountNotificationPreferenceItem[]> {
  const enabledMap = await getCustomerPreferenceEnabledMap(customerId);

  return ACCOUNT_NOTIFICATION_PREFERENCE_DEFINITIONS.map((definition) => ({
    sourceKey: definition.sourceKey,
    label: definition.label,
    detail: definition.detail,
    enabled: enabledMap.get(definition.sourceKey) ?? true,
  }));
}

export async function setCustomerAccountNotificationPreference(customerId: string, sourceKey: string, enabled: boolean) {
  if (!isKnownPreferenceSourceKey(sourceKey)) {
    return false;
  }

  await prisma.customerNotificationPreference.upsert({
    where: {
      customerId_sourceKey: {
        customerId,
        sourceKey,
      },
    },
    update: {
      enabled,
    },
    create: {
      id: `acct_notif_pref_${randomUUID()}`,
      customerId,
      sourceKey,
      enabled,
    },
  });

  return true;
}