export type AccountShellLink = {
  href: string;
  label: string;
  shortLabel?: string;
};

export type AccountShellNotification = {
  id: string;
  tone: "info" | "warning" | "success";
  title: string;
  detail: string;
  href: string;
  createdAt?: string;
  readAt?: string | null;
  snoozedUntil?: string | null;
  expiresAt?: string | null;
};