import React, { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { formatINR } from "@/lib/currency";
import { useApp } from "@/context/AppContext";
import { useDashboard } from "@/hooks/useData";

const SPLITS = [
  { key: "split_needs", label: "Needs", color: "bg-primary" },
  { key: "split_savings", label: "Savings", color: "bg-mint" },
  { key: "split_lifestyle", label: "Lifestyle", color: "bg-amber" },
  { key: "split_goals", label: "Goals", color: "bg-coral" },
  { key: "split_emergency", label: "Emergency", color: "bg-ink-faint" },
] as const;

export default function SalarySplitter() {
  const { settings, updateSettings } = useApp();
  const { data: dashboard } = useDashboard();
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setValues({
        split_needs: settings.split_needs,
        split_savings: settings.split_savings,
        split_lifestyle: settings.split_lifestyle,
        split_goals: settings.split_goals,
        split_emergency: settings.split_emergency,
      });
    }
  }, [settings]);

  const total = Object.values(values).reduce((s, v) => s + (v || 0), 0);
  const salary = dashboard?.currentSalary ?? 0;

  async function save() {
    setSaving(true);
    try {
      await updateSettings(values as never);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-28">
      <TopBar title="Salary Splitter" subtitle="Give every rupee a job" back />
      <div className="px-5 space-y-4">
        <ClayCard>
          <div className="flex h-4 rounded-full overflow-hidden clay-inset mb-4">
            {SPLITS.map((s) => (
              <div key={s.key} className={s.color} style={{ width: `${values[s.key] || 0}%` }} />
            ))}
          </div>
          <div className={`text-center text-sm mb-2 ${total === 100 ? "text-mint" : "text-coral"}`}>
            {total}% allocated {total !== 100 && `(should total 100%)`}
          </div>
        </ClayCard>

        {SPLITS.map((s) => (
          <ClayCard key={s.key} className="!p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${s.color}`} />
                <span className="font-medium text-sm">{s.label}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular text-sm">{values[s.key] || 0}%</div>
                <div className="text-xs text-ink-faint tabular">
                  {formatINR((salary * (values[s.key] || 0)) / 100)}
                </div>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={values[s.key] || 0}
              onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </ClayCard>
        ))}

        <ClayButton fullWidth onClick={save} disabled={saving || total !== 100}>
          {saving ? "Saving…" : "Save Split"}
        </ClayButton>
      </div>
    </div>
  );
}
