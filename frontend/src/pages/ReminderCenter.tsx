import React, { useState } from "react";
import { Bell, AlertTriangle, Info, ShieldAlert, Send, BellRing } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { useReminderCenter, mutate } from "@/hooks/useData";
import clsx from "clsx";

export default function ReminderCenter() {
  const { data, loading, reload } = useReminderCenter();
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function toggle(
    field: "bills" | "budgets" | "subscriptions" | "debts",
    current: number
  ) {
    await mutate("/notifications/preferences", "PATCH", { [field]: current ? 0 : 1 });
    reload();
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      setTestStatus("Notifications are not supported on this browser.");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      setTestStatus("Notifications are enabled. Tap Test Notification to verify delivery.");
    } else if (result === "denied") {
      setTestStatus("Notification permission is blocked in browser settings.");
    }
  }

  async function testNotification() {
    if (!("Notification" in window)) {
      setTestStatus("Notifications are not supported on this browser.");
      return;
    }

    setTesting(true);
    setTestStatus(null);

    try {
      let currentPermission = Notification.permission;

      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== "granted") {
        setTestStatus(
          currentPermission === "denied"
            ? "Notifications are blocked. Allow them from Chrome site settings first."
            : "Please allow notifications first."
        );
        return;
      }

      const options: NotificationOptions = {
        body: "This is a PAYDAY test. Your money reminders can reach this device.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "payday-notification-test",
      };

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("PAYDAY Test Notification", options);
      } else {
        new Notification("PAYDAY Test Notification", options);
      }

      setTestStatus("Test notification sent successfully.");
    } catch (e) {
      try {
        new Notification("PAYDAY Test Notification", {
          body: "This is a PAYDAY notification test.",
          icon: "/icon-192.png",
        });
        setTestStatus("Test notification sent successfully.");
      } catch {
        setTestStatus(e instanceof Error ? e.message : "Could not send the test notification.");
      }
    } finally {
      setTesting(false);
    }
  }

  const prefs = data?.preferences;

  return (
    <div className="pb-28">
      <TopBar title="Reminder Center" subtitle="Bills, budgets, subscriptions & EMIs" back />
      <div className="px-5 space-y-4">
        <ClayCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center">
              <Bell size={19} />
            </div>
            <div>
              <div className="font-semibold">Device notifications</div>
              <div className="text-xs text-ink-faint capitalize">{permission}</div>
            </div>
          </div>

          <ClayButton
            fullWidth
            variant={permission === "granted" ? "neutral" : "primary"}
            onClick={enableBrowserNotifications}
            disabled={permission === "granted" || permission === "unsupported"}
          >
            {permission === "granted" ? "Notifications Allowed" : "Allow Notifications"}
          </ClayButton>

          <ClayButton
            fullWidth
            variant="neutral"
            className="mt-3 flex items-center justify-center gap-2"
            onClick={testNotification}
            disabled={testing || permission === "unsupported"}
          >
            {testing ? <BellRing size={17} className="animate-pulse" /> : <Send size={17} />}
            {testing ? "Sending Test…" : "Test Notification"}
          </ClayButton>

          {testStatus && (
            <div className="clay-inset px-3 py-3 mt-3 text-xs text-ink-soft dark:text-ink-faint">
              {testStatus}
            </div>
          )}

          <p className="text-xs text-ink-faint mt-3">
            Test Notification checks delivery on this device. PAYDAY also keeps an in-app reminder
            center. Background delivery still depends on browser/PWA permissions.
          </p>
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Reminder types</h3>
          {prefs &&
            ([
              ["bills", "Bills"],
              ["budgets", "Budget warnings"],
              ["subscriptions", "Subscriptions"],
              ["debts", "Debt / EMI"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggle(key, prefs[key])}
                className="w-full flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0"
              >
                <span className="text-sm font-medium">{label}</span>
                <span
                  className={clsx(
                    "h-6 w-11 rounded-full p-0.5 transition-colors",
                    prefs[key] ? "bg-primary" : "clay-inset"
                  )}
                >
                  <span
                    className={clsx(
                      "block h-5 w-5 rounded-full bg-white transition-transform shadow",
                      prefs[key] && "translate-x-5"
                    )}
                  />
                </span>
              </button>
            ))}
        </ClayCard>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint px-1 mb-2">
            Current reminders
          </div>

          {loading && <p className="text-sm text-ink-faint">Loading…</p>}

          {!loading && (data?.reminders.length ?? 0) === 0 && (
            <ClayCard>
              <p className="text-sm text-ink-faint text-center py-4">
                You're clear. Nothing needs attention right now.
              </p>
            </ClayCard>
          )}

          <div className="space-y-3">
            {data?.reminders.map((r) => (
              <ClayCard key={r.id} className="!p-4">
                <div className="flex gap-3">
                  <div
                    className={clsx(
                      "h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0",
                      r.severity === "danger"
                        ? "bg-coral-soft text-coral"
                        : r.severity === "warning"
                          ? "bg-amber-soft text-amber"
                          : "bg-primary-soft text-primary"
                    )}
                  >
                    {r.severity === "danger" ? (
                      <ShieldAlert size={17} />
                    ) : r.severity === "warning" ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <Info size={17} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{r.title}</div>
                    <div className="text-xs text-ink-faint mt-0.5">{r.message}</div>
                  </div>
                </div>
              </ClayCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
