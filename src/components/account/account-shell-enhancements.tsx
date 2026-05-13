"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AccountShellLink, AccountShellNotification } from "@/components/account/account-shell-types";

type AccountShellEnhancementsProps = {
  title: string;
  activePath: string;
  links: AccountShellLink[];
  quickActions?: AccountShellLink[];
  notifications?: AccountShellNotification[];
};

type QuickActionItem = AccountShellLink;

type NotificationItem = AccountShellNotification;

function routeSpecificNotifications(activePath: string): AccountShellNotification[] {
  if (activePath.startsWith("/account/activity")) {
    return [
      {
        id: "timeline-filters",
        tone: "info",
        title: "Review recent billing events",
        detail: "Use the timeline alongside Billing Records to understand the sequence of service and payment activity.",
        href: "/account/invoices",
      },
    ];
  }

  if (activePath.startsWith("/account/invoices")) {
    return [
      {
        id: "invoice-support",
        tone: "warning",
        title: "Need invoice clarification?",
        detail: "Open Support & Guidance if a charge needs explanation or follow-up help.",
        href: "/account/notes",
      },
    ];
  }

  if (activePath.startsWith("/account/profile")) {
    return [
      {
        id: "profile-readiness",
        tone: "info",
        title: "Property profile drives service readiness",
        detail: "Keep address and contact details current for stronger routing and treatment prep guidance.",
        href: "/account/profile",
      },
    ];
  }

  return [];
}

function routeSpecificQuickActions(activePath: string): QuickActionItem[] {
  if (activePath.startsWith("/account/activity")) {
    return [
      { href: "/account/services", label: "Review visit activity", shortLabel: "Visits" },
      { href: "/account/invoices", label: "Inspect billing records", shortLabel: "Records" },
    ];
  }

  if (activePath.startsWith("/account/invoices")) {
    return [
      { href: "/account/billing", label: "Open protection plan settings", shortLabel: "Plan" },
      { href: "/account/notes", label: "Ask for invoice explanation", shortLabel: "Support" },
    ];
  }

  if (activePath.startsWith("/account/notes")) {
    return [
      { href: "/account/billing", label: "Review latest charges", shortLabel: "Plan" },
      { href: "/account/services", label: "Check next visit timing", shortLabel: "Visits" },
    ];
  }

  if (activePath.startsWith("/account/profile")) {
    return [
      { href: "/account/services", label: "Review visit readiness", shortLabel: "Visits" },
      { href: "/account/notes", label: "Ask property questions", shortLabel: "AI" },
    ];
  }

  return [];
}

function buildNotifications(activePath: string): AccountShellNotification[] {
  const base: NotificationItem[] = [
    {
      id: "plan-review",
      tone: activePath.startsWith("/account/billing") ? "success" : "warning",
      title: activePath.startsWith("/account/billing") ? "Plan center open" : "Review your protection plan",
      detail: activePath.startsWith("/account/billing")
        ? "You are already in the best place to manage payment settings and charge clarity."
        : "Open Protection Plan to confirm billing confidence and recurring coverage status.",
      href: "/account/billing",
    },
    {
      id: "visit-readiness",
      tone: activePath.startsWith("/account/services") ? "success" : "info",
      title: activePath.startsWith("/account/services") ? "Visit operations active" : "Check visit readiness",
      detail: activePath.startsWith("/account/services")
        ? "Your current page already shows scheduling, readiness, and follow-up guidance."
        : "Review upcoming service windows and preparation steps before your next visit.",
      href: "/account/services",
    },
    {
      id: "support-guidance",
      tone: activePath.startsWith("/account/notes") ? "success" : "info",
      title: activePath.startsWith("/account/notes") ? "Support hub available" : "AI guidance is available",
      detail: "Ask questions about billing, service activity, or property recommendations in Support & Guidance.",
      href: "/account/notes",
    },
  ];

  return [...routeSpecificNotifications(activePath), ...base];
}

type NotificationCenterProps = {
  activePath: string;
  notifications: NotificationItem[];
};

function NotificationCenter({ activePath, notifications: initialNotifications }: NotificationCenterProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const unreadNotificationCount = notifications.filter((item) => !item.readAt).length;
  const notificationBadgeCount = unreadNotificationCount || notifications.length;

  async function markNotificationsRead() {
    if (!unreadNotificationCount) {
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));

    try {
      await fetch("/api/account/notifications", {
        method: "PATCH",
      });
      trackEvent("account_notifications_mark_read", { path: activePath, unreadCount: unreadNotificationCount });
    } catch {
      // Keep the UI responsive even if the persistence round-trip fails.
    }
  }

  async function dismissNotification(notificationId: string) {
    const previousNotifications = notifications;
    setNotifications((current) => current.filter((item) => item.id !== notificationId));

    try {
      const response = await fetch(`/api/account/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setNotifications(previousNotifications);
        return;
      }

      trackEvent("account_notification_dismiss", { path: activePath, notificationId });
    } catch {
      setNotifications(previousNotifications);
    }
  }

  async function snoozeNotification(notificationId: string, hours: number) {
    const previousNotifications = notifications;
    setNotifications((current) => current.filter((item) => item.id !== notificationId));

    try {
      const response = await fetch(`/api/account/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hours,
        }),
      });

      if (!response.ok) {
        setNotifications(previousNotifications);
        return;
      }

      trackEvent("account_notification_snooze", { path: activePath, notificationId, hours });
    } catch {
      setNotifications(previousNotifications);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isNotificationsOpen;
          setIsNotificationsOpen(nextOpen);
          if (nextOpen) {
            void markNotificationsRead();
          }
          trackEvent("account_notifications_toggle", { path: activePath });
        }}
        className="elevated-action relative rounded-full border border-[#d3c7ad] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#163526] dark:border-[#4f6953] dark:bg-[#20352a] dark:text-[#efe6d0]"
        aria-label="Open notification center"
        aria-expanded={isNotificationsOpen}
      >
        Alerts
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#163526] px-1 text-[0.62rem] text-white">
          {notificationBadgeCount}
        </span>
      </button>

      {isNotificationsOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(92vw,24rem)] rounded-3xl border border-[#d8ccaf] bg-[#fffdf6] p-4 shadow-[0_18px_42px_rgba(20,40,30,0.18)] dark:border-[#4c6651] dark:bg-[#1d3026]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#cabca1]">Notification Center</p>
          <h2 className="mt-2 text-lg text-[#173126] dark:text-[#f1e7d2]">Important account signals</h2>
          <div className="mt-4 space-y-3">
            {notifications.length ? notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] p-3 dark:border-[#516b55] dark:bg-[#23392d]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={item.href}
                    className="block min-w-0 flex-1 hover:opacity-85"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e7d2]">{item.title}</p>
                      {!item.readAt ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#163526]" aria-hidden="true" /> : null}
                    </div>
                    <p className="mt-1 text-sm text-[#40584a] dark:text-[#d5c8ad]">{item.detail}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void dismissNotification(item.id)}
                    className="rounded-full border border-[#d4c7ac] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#40584a] transition hover:bg-[#efe3c8] dark:border-[#5a745e] dark:text-[#d8ccb0] dark:hover:bg-[#2a4236]"
                    aria-label={`Dismiss ${item.title}`}
                  >
                    Dismiss
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void snoozeNotification(item.id, 24)}
                    className="rounded-full border border-[#d4c7ac] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#40584a] transition hover:bg-[#efe3c8] dark:border-[#5a745e] dark:text-[#d8ccb0] dark:hover:bg-[#2a4236]"
                  >
                    Snooze 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => void snoozeNotification(item.id, 72)}
                    className="rounded-full border border-[#d4c7ac] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#40584a] transition hover:bg-[#efe3c8] dark:border-[#5a745e] dark:text-[#d8ccb0] dark:hover:bg-[#2a4236]"
                  >
                    Snooze 3d
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-[#d7caae] bg-[#fff9ec] px-4 py-5 text-sm text-[#4b6355] dark:border-[#516b55] dark:bg-[#22372c] dark:text-[#d8ccb0]">
                You are all caught up. New account alerts will appear here as conditions change.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AccountShellEnhancements({ title, activePath, links, quickActions: quickActionOverrides, notifications: notificationOverrides }: AccountShellEnhancementsProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((current) => {
          const next = !current;
          if (next) {
            trackEvent("account_command_palette_open", { source: "keyboard_shortcut", path: activePath });
          }
          return next;
        });
      }

      if (event.key === "Escape") {
        setIsPaletteOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePath]);

  const quickActions = useMemo(() => {
    if (quickActionOverrides?.length) {
      return quickActionOverrides;
    }

    const baseActions: QuickActionItem[] = [
      ...routeSpecificQuickActions(activePath),
      ...links,
      { href: "/account/notes", label: "Ask AI for help", shortLabel: "AI" },
      { href: "/account/services", label: "Review upcoming visits", shortLabel: "Visits" },
      { href: "/account/billing", label: "Check billing confidence", shortLabel: "Plan" },
    ];

    return baseActions.filter((item, index, collection) => collection.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index);
  }, [activePath, links, quickActionOverrides]);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return quickActions;
    }

    return quickActions.filter((item) => item.label.toLowerCase().includes(normalized) || item.href.toLowerCase().includes(normalized));
  }, [query, quickActions]);
  const baseNotifications = notificationOverrides?.length ? notificationOverrides : buildNotifications(activePath);
  const notificationStateKey = `${activePath}:${baseNotifications.map((item) => `${item.id}:${item.readAt ?? "unread"}`).join("|")}`;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsPaletteOpen(true);
            trackEvent("account_command_palette_open", { source: "button", path: activePath });
          }}
          className="elevated-action rounded-full border border-[#d3c7ad] bg-[#fffaf0] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#163526] dark:border-[#4f6953] dark:bg-[#20352a] dark:text-[#efe6d0]"
          aria-label="Open command palette"
        >
          Search
          <span className="ml-2 rounded-md border border-[#d8ccaf] px-1.5 py-0.5 text-[0.62rem] dark:border-[#5a745e]">Ctrl K</span>
        </button>

        <NotificationCenter key={notificationStateKey} activePath={activePath} notifications={baseNotifications} />
      </div>

      {isPaletteOpen ? (
        <div className="fixed inset-0 z-40 bg-[rgba(15,26,21,0.45)] px-4 py-8 backdrop-blur-sm" onClick={() => setIsPaletteOpen(false)}>
          <div
            className="mx-auto w-full max-w-2xl rounded-3xl border border-[#d8ccaf] bg-[#fffdf6] p-5 shadow-[0_28px_64px_rgba(20,40,30,0.24)] dark:border-[#4c6651] dark:bg-[#1d3026]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#cabca1]">Command Palette</p>
            <h2 className="mt-2 text-xl text-[#173126] dark:text-[#f1e7d2]">Find actions across your protection dashboard</h2>
            <p className="mt-1 text-sm text-[#42594b] dark:text-[#d3c6aa]">Search sections, jump to workflows, and reopen key account surfaces from anywhere.</p>

            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search within ${title.toLowerCase()} and account tools`}
              className="field mt-4"
              aria-label="Search dashboard actions"
            />

            <div className="mt-4 space-y-2">
              {filteredActions.length ? (
                filteredActions.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={`block rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      item.href === activePath
                        ? "border-[#163526] bg-[#163526] text-white"
                        : "border-[#ddd2b8] bg-[#fff8ea] text-[#173126] hover:bg-[#f6ebd8] dark:border-[#516b55] dark:bg-[#23392d] dark:text-[#efe5cf] dark:hover:bg-[#294136]"
                    }`}
                    onClick={() => {
                      setIsPaletteOpen(false);
                      trackEvent("account_command_palette_select", { href: item.href, path: activePath });
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="ml-2 text-xs font-medium opacity-70">{item.href}</span>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-[#ddd2b8] bg-[#fff8ea] px-4 py-3 text-sm text-[#40584a] dark:border-[#516b55] dark:bg-[#23392d] dark:text-[#d5c8ad]">
                  No matching actions yet. Try searching for visits, plan, timeline, or support.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}