import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { CalendarDays, SlidersHorizontal, HandCoins } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { api } from "@/lib/api";
import { formatCompactINR } from "@/lib/currency";

interface BreakdownItem {
  category: string;
  amount: number;
  color: string;
}
interface GrowthPoint {
  date: string;
  amount: number;
}
interface Prediction {
  predictedEndBalance: number;
  avgDailySpend: number;
}

const COLORS = ["#4B4FE0", "#16A97C", "#D6952E", "#E1574F", "#8A8FA3", "#7C7FEF"];

export default function Insights() {
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    api.get<{ items: BreakdownItem[] }>("/insights/spending-breakdown").then((r) =>
      setBreakdown(r.items.map((it, i) => ({ ...it, color: COLORS[i % COLORS.length] })))
    ).catch(() => {});
    api.get<{ points: GrowthPoint[] }>("/insights/salary-growth").then((r) => setGrowth(r.points)).catch(() => {});
    api.get<Prediction>("/insights/prediction").then(setPrediction).catch(() => {});
  }, []);

  const totalSpend = breakdown.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="pb-28">
      <TopBar title="Insights" subtitle="Understand your money" />
      <div className="px-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Link to="/splitter" className="clay-surface-sm clay-pressable p-3 flex flex-col items-center text-center">
            <SlidersHorizontal size={18} className="text-primary mb-1" />
            <span className="text-xs font-semibold">Splitter</span>
          </Link>
          <Link to="/calendar" className="clay-surface-sm clay-pressable p-3 flex flex-col items-center text-center">
            <CalendarDays size={18} className="text-primary mb-1" />
            <span className="text-xs font-semibold">Calendar</span>
          </Link>
          <Link to="/lending" className="clay-surface-sm clay-pressable p-3 flex flex-col items-center text-center">
            <HandCoins size={18} className="text-primary mb-1" />
            <span className="text-xs font-semibold">Lent/Borrow</span>
          </Link>
        </div>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Monthly Spending Breakdown</h3>
          {breakdown.length === 0 ? (
            <p className="text-sm text-ink-faint py-6 text-center">No spending logged this cycle yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={breakdown} dataKey="amount" nameKey="category" innerRadius={38} outerRadius={58} paddingAngle={2}>
                      {breakdown.map((b, i) => (
                        <Cell key={i} fill={b.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {breakdown.slice(0, 5).map((b) => (
                  <div key={b.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                      <span className="truncate">{b.category}</span>
                    </div>
                    <span className="text-ink-faint shrink-0 ml-2">
                      {totalSpend ? Math.round((b.amount / totalSpend) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Salary Growth</h3>
          {growth.length < 2 ? (
            <p className="text-sm text-ink-faint py-6 text-center">Add a few salary entries to see your trend.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer>
                <LineChart data={growth}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                  <Tooltip formatter={(v: number) => formatCompactINR(v)} labelFormatter={() => ""} />
                  <Line type="monotone" dataKey="amount" stroke="#4B4FE0" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-2">Month-End Prediction</h3>
          <p className="text-sm text-ink-faint mb-3">
            Based on your average spend of {prediction ? formatCompactINR(prediction.avgDailySpend) : "–"}/day
          </p>
          <div className="clay-inset px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Projected balance at cycle end</span>
            <Amount value={prediction?.predictedEndBalance ?? 0} size="lg" />
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
