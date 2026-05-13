"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

type NotificationPreferenceItem = {
  sourceKey: string;
  label: string;
  detail: string;
  enabled: boolean;
};

type AccountNotificationPreferencesProps = {
  initialPreferences: NotificationPreferenceItem[];
};

export function AccountNotificationPreferences({ initialPreferences }: AccountNotificationPreferencesProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingSourceKey, setSavingSourceKey] = useState<string | null>(null);

  async function togglePreference(sourceKey: string, enabled: boolean) {
    const previous = preferences;
    setPreferences((current) => current.map((item) => item.sourceKey === sourceKey ? { ...item, enabled } : item));
    setSavingSourceKey(sourceKey);

    try {
      const response = await fetch("/api/account/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceKey,
          enabled,
        }),
      });

      if (!response.ok) {
        setPreferences(previous);
        return;
      }

      trackEvent("account_notification_preference_update", { sourceKey, enabled });
    } catch {
      setPreferences(previous);
    } finally {
      setSavingSourceKey(null);
    }
  }

  return (
    <div className="grid gap-3">
      {preferences.map((preference) => (
        <div
          key={preference.sourceKey}
          className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#173126] dark:text-[#f1e7d2]">{preference.label}</p>
              <p className="mt-1 text-sm text-[#40584a] dark:text-[#d5c8ad]">{preference.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => void togglePreference(preference.sourceKey, !preference.enabled)}
              disabled={savingSourceKey === preference.sourceKey}
              aria-pressed={preference.enabled}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                preference.enabled
                  ? "border-[#1e5037] bg-[#1e5037] text-white"
                  : "border-[#b9ad91] bg-[#f7efdb] text-[#33453a] dark:border-[#5a745e] dark:bg-[#2a4136] dark:text-[#d8ccb0]"
              } ${savingSourceKey === preference.sourceKey ? "opacity-70" : ""}`}
            >
              {savingSourceKey === preference.sourceKey ? "Saving" : preference.enabled ? "Enabled" : "Muted"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}