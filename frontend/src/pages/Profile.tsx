import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Smartphone, Lock, Download, LogOut, ChevronRight, Target, History,
  SlidersHorizontal, Gauge, Repeat2, ShieldCheck, Landmark, Bell,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function Profile() {
  const { user, settings, theme, setTheme, updateSettings, logout } = useApp();
  const navigate = useNavigate();
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cycleDay, setCycleDay] = useState(String(user?.salary_cycle_day ?? 1));

  async function saveCycleDay() { await api.patch("/me", { salary_cycle_day: Number(cycleDay) }); }
  async function exportData(format: "json" | "csv") {
    const blob = await api.download(`/export?format=${format}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payday-export.${format}`; a.click();
    URL.revokeObjectURL(url); setExportOpen(false);
  }

  return (
    <div className="pb-28">
      <TopBar title="Profile" subtitle={user?.email} />
      <div className="px-5 space-y-4">
        <ClayCard className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-display font-bold">{user?.name?.[0]?.toUpperCase() || "P"}</div>
          <div><div className="font-display font-semibold">{user?.name}</div><div className="text-sm text-ink-faint">{user?.email}</div></div>
        </ClayCard>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/goals" className="clay-surface-sm clay-pressable p-4 flex items-center gap-3"><Target size={18} className="text-primary" /><span className="text-sm font-semibold">Savings Goals</span></Link>
          <Link to="/salary-history" className="clay-surface-sm clay-pressable p-4 flex items-center gap-3"><History size={18} className="text-primary" /><span className="text-sm font-semibold">Salary History</span></Link>
        </div>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Money Management</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniLink to="/budgets" icon={<Gauge size={17}/>} label="Budgets" />
            <MiniLink to="/recurring" icon={<Repeat2 size={17}/>} label="Recurring" />
            <MiniLink to="/emergency-fund" icon={<ShieldCheck size={17}/>} label="Emergency Fund" />
            <MiniLink to="/debts" icon={<Landmark size={17}/>} label="Debt & EMI" />
          </div>
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Salary Cycle</h3>
          <ClayInput label="Salary lands on day of month" type="number" min={1} max={31} value={cycleDay} onChange={(e) => setCycleDay(e.target.value)} onBlur={saveCycleDay} />
          <p className="text-xs text-ink-faint -mt-2">All cycle-based numbers (safe-to-spend, spent/saved this cycle) are calculated from this date, not the calendar month.</p>
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Appearance</h3>
          <div className="grid grid-cols-3 gap-2">{[
            { key: "light" as const, icon: Sun, label: "Light" }, { key: "dark" as const, icon: Moon, label: "Dark" }, { key: "system" as const, icon: Smartphone, label: "System" },
          ].map((opt) => <button key={opt.key} onClick={() => setTheme(opt.key)} className={`flex flex-col items-center gap-1.5 py-3 rounded-clay-sm text-xs font-semibold ${theme === opt.key ? "bg-primary text-white shadow-clay-raised-sm" : "clay-inset text-ink-soft"}`}><opt.icon size={18} />{opt.label}</button>)}</div>
        </ClayCard>

        <ClayCard className="!p-2">
          <RowButton icon={<SlidersHorizontal size={18} />} label="Salary Splitter Settings" onClick={() => navigate("/splitter")} />
          <RowButton icon={<Bell size={18} />} label="Reminder Center" onClick={() => navigate("/reminders")} />
          <RowButton icon={<Lock size={18} />} label={settings?.pin_enabled ? "Change PIN Lock" : "Set up PIN Lock"} onClick={() => setPinSheetOpen(true)} />
          <RowButton icon={<Download size={18} />} label="Export My Data" onClick={() => setExportOpen(true)} />
        </ClayCard>

        <ClayButton variant="danger" fullWidth onClick={async () => { await logout(); navigate("/login"); }}><span className="flex items-center justify-center gap-2"><LogOut size={18} /> Sign out</span></ClayButton>
      </div>

      <PinSetupSheet open={pinSheetOpen} onClose={() => setPinSheetOpen(false)} enabled={!!settings?.pin_enabled} onSaved={(enabled) => updateSettings({ pin_enabled: enabled ? 1 : 0 })} />
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title="Export My Data">
        <div className="space-y-3">
          <button onClick={() => exportData("csv")} className="w-full clay-surface-sm clay-pressable p-4 text-left"><div className="font-semibold">CSV Spreadsheet</div><div className="text-sm text-ink-faint mt-1">Easy to open in Excel or Google Sheets.</div></button>
          <button onClick={() => exportData("json")} className="w-full clay-surface-sm clay-pressable p-4 text-left"><div className="font-semibold">Full JSON Backup</div><div className="text-sm text-ink-faint mt-1">Complete structured backup of your PAYDAY data.</div></button>
        </div>
      </Sheet>
    </div>
  );
}

function MiniLink({to, icon, label}:{to:string;icon:React.ReactNode;label:string}) { return <Link to={to} className="clay-inset p-3 rounded-clay-sm flex items-center gap-2 text-sm font-semibold"><span className="text-primary">{icon}</span>{label}</Link>; }
function RowButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="w-full flex items-center justify-between p-3.5 clay-pressable rounded-clay-sm"><span className="flex items-center gap-3 text-sm font-medium">{icon}{label}</span><ChevronRight size={16} className="text-ink-faint" /></button>; }

function PinSetupSheet({ open, onClose, enabled, onSaved }: { open: boolean; onClose: () => void; enabled: boolean; onSaved: (enabled: boolean) => void; }) {
  const [pin, setPin] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState<string | null>(null);
  async function save() { if (!/^\d{4}$/.test(pin)) return setError("PIN must be 4 digits"); if (pin !== confirm) return setError("PINs don't match"); await api.post("/auth/set-pin", { pin }); onSaved(true); setPin(""); setConfirm(""); setError(null); onClose(); }
  async function disable() { await api.post("/auth/disable-pin"); onSaved(false); onClose(); }
  return <Sheet open={open} onClose={onClose} title={enabled ? "Change PIN" : "Set up PIN"}><ClayInput label="New 4-digit PIN" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /><ClayInput label="Confirm PIN" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} />{error && <p className="text-coral text-sm mb-3">{error}</p>}<ClayButton fullWidth onClick={save}>Save PIN</ClayButton>{enabled && <ClayButton fullWidth variant="ghost" className="mt-2" onClick={disable}>Turn off PIN lock</ClayButton>}</Sheet>;
}
