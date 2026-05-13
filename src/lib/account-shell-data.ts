import "server-only";

import type { AccountShellLink, AccountShellNotification } from "@/components/account/account-shell-types";
import { getPersistedAccountNotificationsForSnapshot } from "@/lib/account-notifications";
import type { CustomerAccountSnapshot } from "@/lib/customer-account-data";

type AccountShellPage = "home" | "services" | "billing" | "activity" | "invoices" | "profile" | "notes";

type AccountShellState = {
  quickActions: AccountShellLink[];
  notifications: AccountShellNotification[];
};

const DAY_MS = 1000 * 60 * 60 * 24;

function deriveProtectionState(snapshot: CustomerAccountSnapshot) {
  const now = new Date();
  const lastServiceDate = snapshot.customer.lastServiceDate;
  const lastServiceDaysAgo = lastServiceDate ? Math.max(0, Math.round((now.getTime() - lastServiceDate.getTime()) / DAY_MS)) : 999;
  const openInvoices = snapshot.invoices.filter((invoice) => invoice.status !== "paid");
  const openBalance = openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const protectionScore = Math.max(
    42,
    100 - Math.min(30, Math.floor(lastServiceDaysAgo / 6)) - Math.min(20, openInvoices.length * 6) - (snapshot.customer.lifecycle === "past_due" ? 18 : 0),
  );

  return {
    lastServiceDate,
    openInvoices,
    openBalance,
    protectionScore,
  };
}

function deriveVisitState(snapshot: CustomerAccountSnapshot) {
  const now = new Date();
  const upcomingBookings = snapshot.bookings
    .filter((booking) => booking.preferredDate.getTime() >= now.getTime())
    .sort((a, b) => a.preferredDate.getTime() - b.preferredDate.getTime());
  const recentJobs = [...snapshot.jobs].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  const nextVisit = recentJobs.find((job) => job.scheduledAt.getTime() >= now.getTime()) ?? upcomingBookings[0] ?? null;

  return {
    upcomingBookings,
    recentJobs,
    nextVisit,
  };
}

export async function buildAccountShellState(snapshot: CustomerAccountSnapshot, page: AccountShellPage): Promise<AccountShellState> {
  const protection = deriveProtectionState(snapshot);
  const visits = deriveVisitState(snapshot);
  const notifications = await getPersistedAccountNotificationsForSnapshot(snapshot);

  switch (page) {
    case "home": {
      return {
        quickActions: [
          { href: "/account/services", label: visits.nextVisit ? "Review next protection visit" : "Schedule your first protection visit" },
          { href: "/account/billing", label: protection.openInvoices.length ? `Resolve ${protection.openInvoices.length} billing item${protection.openInvoices.length > 1 ? "s" : ""}` : "Review protection plan health" },
          { href: "/account/notes", label: "Ask AI for guidance" },
        ],
        notifications,
      };
    }
    case "services": {
      return {
        quickActions: [
          { href: "/account/services", label: visits.nextVisit ? "Review next visit details" : "Request a protection visit" },
          { href: "/account/notes", label: "Ask about treatment prep" },
          { href: "/account/activity", label: "Open protection timeline" },
        ],
        notifications,
      };
    }
    case "billing": {
      return {
        quickActions: [
          { href: "/account/billing", label: snapshot.customer.stripeCustomerId ? "Manage payment methods" : "Link billing details" },
          { href: "/account/invoices", label: protection.openInvoices.length ? `Review ${protection.openInvoices.length} open invoice${protection.openInvoices.length > 1 ? "s" : ""}` : "Open billing records" },
          { href: "/account/notes", label: "Ask for charge explanation" },
        ],
        notifications,
      };
    }
    case "activity": {
      return {
        quickActions: [
          { href: "/account/activity", label: "Review latest account events" },
          { href: "/account/services", label: "Cross-check visit activity" },
          { href: "/account/invoices", label: "Review billing sequence" },
        ],
        notifications,
      };
    }
    case "invoices": {
      return {
        quickActions: [
          { href: "/account/invoices", label: protection.openInvoices.length ? `Review ${protection.openInvoices.length} open invoice${protection.openInvoices.length > 1 ? "s" : ""}` : "Review invoice library" },
          { href: "/account/billing", label: "Open protection plan controls" },
          { href: "/account/notes", label: "Ask for invoice explanation" },
        ],
        notifications,
      };
    }
    case "profile": {
      return {
        quickActions: [
          { href: "/account/profile", label: snapshot.customer.addressLine1 ? "Update property profile" : "Add property address details" },
          { href: "/account/services", label: "Review visit readiness" },
          { href: "/account/notes", label: "Ask property questions" },
        ],
        notifications,
      };
    }
    case "notes": {
      return {
        quickActions: [
          { href: "/account/notes", label: snapshot.notes.length ? "Review support history" : "Start your first support conversation" },
          { href: "/account/billing", label: "Check recent charges" },
          { href: "/account/services", label: "Review next visit timing" },
        ],
        notifications,
      };
    }
  }
}