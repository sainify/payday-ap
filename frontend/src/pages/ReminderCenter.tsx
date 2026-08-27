import React, { useEffect, useState } from "react";
import {
  Bell,
  AlertTriangle,
  Info,
  ShieldAlert,
  Send,
  BellRing,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { useReminderCenter, mutate } from "@/hooks/useData";
import clsx from "clsx";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export default function ReminderCenter() {
  const { data, loading, reload } = useReminderCenter();

  const [permission, setPermission] =
    useState<PermissionState>("prompt");

  const [testStatus, setTestStatus] =
    useState<string | null>(null);

  const [testing, setTesting] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    void checkNotificationPermission();
  }, []);

  async function checkNotificationPermission() {
    try {
      if (isNative) {
        const result = await LocalNotifications.checkPermissions();

        setPermission(
          result.display === "granted"
            ? "granted"
            : result.display === "denied"
              ? "denied"
              : "prompt"
        );

        return;
      }

      if ("Notification" in window) {
        const current = Notification.permission;

        setPermission(
          current === "granted"
            ? "granted"
            : current === "denied"
              ? "denied"
              : "prompt"
        );
      } else {
        setPermission("unsupported");
      }
    } catch (error) {
      console.error("Notification permission check failed:", error);
      setPermission("unsupported");
    }
  }

  async function toggle(
    field: "bills" | "budgets" | "subscriptions" | "debts",
    current: number
  ) {
    await mutate("/notifications/preferences", "PATCH", {
      [field]: current ? 0 : 1,
    });

    reload();
  }

  async function enableNotifications() {
    setTestStatus(null);

    try {
      if (isNative) {
        const result = await LocalNotifications.requestPermissions();

        if (result.display === "granted") {
          setPermission("granted");
          setTestStatus(
            "Notifications enabled successfully. Tap Test Notification to check."
          );
        } else {
          setPermission("denied");
          setTestStatus(
            "Notification permission was denied. Please allow notifications from Android App Settings."
          );
        }

        return;
      }

      if (!("Notification" in window)) {
        setPermission("unsupported");
        setTestStatus(
          "Notifications are not supported on this device."
        );
        return;
      }

      const result = await Notification.requestPermission();

      setPermission(
        result === "granted"
          ? "granted"
          : result === "denied"
            ? "denied"
            : "prompt"
      );

      if (result === "granted") {
        setTestStatus(
          "Notifications enabled successfully."
        );
      } else {
        setTestStatus(
          "Notification permission was denied."
        );
      }
    } catch (error) {
      console.error(error);

      setTestStatus(
        error instanceof Error
          ? error.message
          : "Could not enable notifications."
      );
    }
  }

  async function testNotification() {
    setTesting(true);
    setTestStatus(null);

    try {
      if (isNative) {
        let result = await LocalNotifications.checkPermissions();

        if (result.display !== "granted") {
          result = await LocalNotifications.requestPermissions();
        }

        if (result.display !== "granted") {
          setPermission("denied");
          setTestStatus(
            "Please allow PAYDAY notification permission first."
          );
          return;
        }

        setPermission("granted");

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1000000),
              title: "PAYDAY Test Notification",
              body: "Native Android notifications are working successfully 🎉",
              schedule: {
                at: new Date(Date.now() + 2000),
              },
              sound: "default",
              extra: {
                source: "payday-test",
              },
            },
          ],
        });

        setTestStatus(
          "Test notification scheduled. It should appear in about 2 seconds."
        );

        return;
      }

      if (!("Notification" in window)) {
        setPermission("unsupported");
        setTestStatus(
          "Notifications are not supported in this browser."
        );
        return;
      }

      let currentPermission = Notification.permission;

      if (currentPermission === "default") {
        currentPermission =
          await Notification.requestPermission();
      }

      if (currentPermission !== "granted") {
        setPermission("denied");
        setTestStatus(
          "Please allow notification permission first."
        );
        return;
      }

      setPermission("granted");

      new Notification("PAYDAY Test Notification", {
        body: "PAYDAY notifications are working.",
        icon: "/icon-192.png",
      });

      setTestStatus(
        "Test notification sent successfully."
      );
    } catch (error) {
      console.error("Notification error:", error);

      setTestStatus(
        error instanceof Error
          ? error.message
          : "Could not send the test notification."
      );
    } finally {
      setTesting(false);
    }
  }

  const prefs = data?.preferences;

  const permissionLabel =
    permission === "granted"
      ? "Allowed"
      : permission === "denied"
        ? "Blocked"
        : permission === "prompt"
          ? "Permission required"
          : "Unsupported";

  return (
    <div className="pb-28">
      <TopBar
        title="Reminder Center"
        subtitle="Bills, budgets, subscriptions & EMIs"
        back
      />

      <div className="px-5 space-y-4">
        <ClayCard>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center">
              <Bell size={19} />
            </div>

            <div>
              <div className="font-semibold">
                Device notifications
              </div>

              <div className="text-xs text-ink-faint">
                {permissionLabel}
                {isNative ? " • Android" : " • Browser"}
              </div>
            </div>
          </div>

          <ClayButton
            fullWidth
            variant={
              permission === "granted"
                ? "neutral"
                : "primary"
            }
            onClick={enableNotifications}
            disabled={permission === "granted"}
          >
            {permission === "granted"
              ? "Notifications Allowed"
              : permission === "denied"
                ? "Try Again"
                : "Allow Notifications"}
          </ClayButton>

          <ClayButton
            fullWidth
            variant="neutral"
            className="mt-3 flex items-center justify-center gap-2"
            onClick={testNotification}
            disabled={testing}
          >
            {testing ? (
              <BellRing
                size={17}
                className="animate-pulse"
              />
            ) : (
              <Send size={17} />
            )}

            {testing
              ? "Sending Test…"
              : "Test Notification"}
          </ClayButton>

          {testStatus && (
            <div className="clay-inset px-3 py-3 mt-3 text-xs text-ink-soft dark:text-ink-faint">
              {testStatus}
            </div>
          )}

          <p className="text-xs text-ink-faint mt-3">
            {isNative
              ? "PAYDAY is running as an Android app. Native device notifications are available."
              : "PAYDAY is running in a browser. Notification support depends on browser permissions."}
          </p>
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">
            Reminder types
          </h3>

          {prefs &&
            ([
              ["bills", "Bills"],
              ["budgets", "Budget warnings"],
              ["subscriptions", "Subscriptions"],
              ["debts", "Debt / EMI"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  toggle(key, prefs[key])
                }
                className="w-full flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0"
              >
                <span className="text-sm font-medium">
                  {label}
                </span>

                <span
                  className={clsx(
                    "h-6 w-11 rounded-full p-0.5 transition-colors",
                    prefs[key]
                      ? "bg-primary"
                      : "clay-inset"
                  )}
                >
                  <span
                    className={clsx(
                      "block h-5 w-5 rounded-full bg-white transition-transform shadow",
                      prefs[key] &&
                        "translate-x-5"
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

          {loading && (
            <p className="text-sm text-ink-faint">
              Loading…
            </p>
          )}

          {!loading &&
            (data?.reminders.length ?? 0) === 0 && (
              <ClayCard>
                <p className="text-sm text-ink-faint text-center py-4">
                  You're clear. Nothing needs attention
                  right now.
                </p>
              </ClayCard>
            )}

          <div className="space-y-3">
            {data?.reminders.map((r) => (
              <ClayCard
                key={r.id}
                className="!p-4"
              >
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
                    ) : r.severity ===
                      "warning" ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <Info size={17} />
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-sm">
                      {r.title}
                    </div>

                    <div className="text-xs text-ink-faint mt-0.5">
                      {r.message}
                    </div>
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
