import React, { useState } from "react";
import { Bell, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { useReminderCenter, mutate } from "@/hooks/useData";
import clsx from "clsx";

export default function ReminderCenter() {
  const { data, loading, reload } = useReminderCenter();
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  async function toggle(field: "bills" | "budgets" | "subscriptions" | "debts", current: number) {
    await mutate("/notifications/preferences", "PATCH", { [field]: current ? 0 : 1 }); reload();
  }
  async function enableBrowserNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission(); setPermission(result);
    if (result === "granted") new Notification("PAYDAY reminders enabled", { body: "We'll surface important money reminders when the app is active." });
  }

  const prefs = data?.preferences;
  return <div className="pb-28">
    <TopBar title="Reminder Center" subtitle="Bills, budgets, subscriptions & EMIs" back />
    <div className="px-5 space-y-4">
      <ClayCard>
        <div className="flex items-center gap-3 mb-3"><div className="h-11 w-11 rounded-clay-sm bg-primary-soft text-primary flex items-center justify-center"><Bell size={19}/></div><div><div className="font-semibold">Device notifications</div><div className="text-xs text-ink-faint capitalize">{permission}</div></div></div>
        <ClayButton fullWidth variant={permission === "granted" ? "neutral" : "primary"} onClick={enableBrowserNotifications} disabled={permission === "granted" || permission === "unsupported"}>{permission === "granted" ? "Notifications Allowed" : "Allow Notifications"}</ClayButton>
        <p className="text-xs text-ink-faint mt-3">PAYDAY also keeps an in-app reminder center. Browser delivery depends on device/PWA permissions.</p>
      </ClayCard>

      <ClayCard>
        <h3 className="font-display font-semibold mb-3">Reminder types</h3>
        {prefs && ([['bills','Bills'],['budgets','Budget warnings'],['subscriptions','Subscriptions'],['debts','Debt / EMI']] as const).map(([key,label]) => <button key={key} onClick={() => toggle(key, prefs[key])} className="w-full flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0"><span className="text-sm font-medium">{label}</span><span className={clsx("h-6 w-11 rounded-full p-0.5 transition-colors", prefs[key] ? "bg-primary" : "clay-inset")}><span className={clsx("block h-5 w-5 rounded-full bg-white transition-transform shadow", prefs[key] && "translate-x-5")}/></span></button>)}
      </ClayCard>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint px-1 mb-2">Current reminders</div>
        {loading && <p className="text-sm text-ink-faint">Loading…</p>}
        {!loading && (data?.reminders.length ?? 0) === 0 && <ClayCard><p className="text-sm text-ink-faint text-center py-4">You're clear. Nothing needs attention right now.</p></ClayCard>}
        <div className="space-y-3">{data?.reminders.map((r) => <ClayCard key={r.id} className="!p-4"><div className="flex gap-3"><div className={clsx("h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0", r.severity === "danger" ? "bg-coral-soft text-coral" : r.severity === "warning" ? "bg-amber-soft text-amber" : "bg-primary-soft text-primary")}>{r.severity === "danger" ? <ShieldAlert size={17}/> : r.severity === "warning" ? <AlertTriangle size={17}/> : <Info size={17}/>}</div><div><div className="font-semibold text-sm">{r.title}</div><div className="text-xs text-ink-faint mt-0.5">{r.message}</div></div></div></ClayCard>)}</div>
      </div>
    </div>
  </div>;
}
