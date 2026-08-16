import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  CalendarDays, SlidersHorizontal, HandCoins, Gauge, Repeat2, ShieldCheck, Landmark,
  TrendingDown, TrendingUp, Donut, ChartNoAxesColumnIncreasing, Waves,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { api } from "@/lib/api";
import { formatCompactINR, formatINR } from "@/lib/currency";
import clsx from "clsx";

interface BreakdownItem { category: string; amount: number; color: string; }
interface GrowthPoint { date: string; amount: number; }
interface Prediction { predictedEndBalance: number; avgDailySpend: number; }
interface Overview {
  currentSpend: number; previousSpend: number; spendChangePct: number | null; currentIncome: number;
  savings: number; savingsRate: number; topCategory: { category: string; amount: number } | null;
  budgetsOnTrack: number; budgetsTotal: number; subscriptionRunRate: number; averageDailySpend: number;
}

type SpendChartMode = "3d" | "donut" | "bars";
type GrowthChartMode = "line" | "area" | "bars";

const COLORS = ["#4B4FE0", "#16A97C", "#D6952E", "#E1574F", "#8A8FA3", "#7C7FEF"];

function shadeHex(hex: string, percent: number) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

export default function Insights() {
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [spendChart, setSpendChart] = useState<SpendChartMode>(() => {
    const saved = localStorage.getItem("payday_spend_chart");
    return saved === "donut" || saved === "bars" ? saved : "3d";
  });

  const [growthChart, setGrowthChart] = useState<GrowthChartMode>(() => {
    const saved = localStorage.getItem("payday_growth_chart");
    return saved === "area" || saved === "bars" ? saved : "line";
  });

  useEffect(() => {
    api.get<{ items: Omit<BreakdownItem, "color">[] }>("/insights/spending-breakdown")
      .then((r) => setBreakdown(r.items.map((it, i) => ({ ...it, color: COLORS[i % COLORS.length] }))))
      .catch(() => {});
    api.get<{ points: GrowthPoint[] }>("/insights/salary-growth")
      .then((r) => setGrowth(r.points))
      .catch(() => {});
    api.get<Prediction>("/insights/prediction").then(setPrediction).catch(() => {});
    api.get<Overview>("/insights/overview").then(setOverview).catch(() => {});
  }, []);

  useEffect(() => localStorage.setItem("payday_spend_chart", spendChart), [spendChart]);
  useEffect(() => localStorage.setItem("payday_growth_chart", growthChart), [growthChart]);

  const totalSpend = useMemo(
    () => breakdown.reduce((s, b) => s + Number(b.amount), 0),
    [breakdown]
  );
  const spendingImproved = (overview?.spendChangePct ?? 0) <= 0;

  return (
    <div className="pb-28">
      <TopBar title="Insights" subtitle="Understand your money" />
      <div className="px-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <QuickLink to="/splitter" icon={<SlidersHorizontal size={18} />} label="Splitter" />
          <QuickLink to="/calendar" icon={<CalendarDays size={18} />} label="Calendar" />
          <QuickLink to="/lending" icon={<HandCoins size={18} />} label="Lent/Borrow" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ClayCard className="!p-4">
            <div className="text-xs text-ink-faint mb-1">Savings rate</div>
            <div className="text-2xl font-display font-bold text-mint">
              {Math.round(overview?.savingsRate || 0)}%
            </div>
            <div className="text-xs text-ink-faint mt-1">of cycle income</div>
          </ClayCard>

          <ClayCard className="!p-4">
            <div className="text-xs text-ink-faint mb-1">Vs last cycle</div>
            <div
              className={clsx(
                "text-2xl font-display font-bold flex items-center gap-1",
                spendingImproved ? "text-mint" : "text-coral"
              )}
            >
              {spendingImproved ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
              {overview?.spendChangePct == null ? "–" : `${Math.abs(Math.round(overview.spendChangePct))}%`}
            </div>
            <div className="text-xs text-ink-faint mt-1">
              spending {spendingImproved ? "lower" : "higher"}
            </div>
          </ClayCard>
        </div>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">Cycle Snapshot</h3>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Income" value={formatINR(overview?.currentIncome || 0)} />
            <Metric label="Daily average" value={`${formatINR(overview?.averageDailySpend || 0)}/day`} />
            <Metric label="Top category" value={overview?.topCategory?.category || "–"} />
            <Metric
              label="Budgets on track"
              value={overview?.budgetsTotal ? `${overview.budgetsOnTrack}/${overview.budgetsTotal}` : "Not set"}
            />
          </div>
          {overview && overview.subscriptionRunRate > 0 && (
            <div className="clay-inset px-4 py-3 mt-3 flex items-center justify-between">
              <span className="text-sm text-ink-faint">Active subscriptions total</span>
              <Amount value={overview.subscriptionRunRate} size="sm" />
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display font-semibold">Salary-Cycle Spending Breakdown</h3>
              <p className="text-xs text-ink-faint mt-1">Choose how you want to view your spending.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <ChartModeButton
              active={spendChart === "3d"}
              onClick={() => setSpendChart("3d")}
              icon={<Donut size={15} />}
              label="3D"
            />
            <ChartModeButton
              active={spendChart === "donut"}
              onClick={() => setSpendChart("donut")}
              icon={<Donut size={15} />}
              label="Donut"
            />
            <ChartModeButton
              active={spendChart === "bars"}
              onClick={() => setSpendChart("bars")}
              icon={<ChartNoAxesColumnIncreasing size={15} />}
              label="Bars"
            />
          </div>

          {breakdown.length === 0 ? (
            <p className="text-sm text-ink-faint py-6 text-center">
              No spending logged this cycle yet.
            </p>
          ) : (
            <>
              {spendChart === "bars" ? (
                <div className="h-52">
                  <ResponsiveContainer>
                    <BarChart
                      data={breakdown}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={72}
                        tick={{ fontSize: 11, fill: "#8A8FA3" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => formatCompactINR(Number(v))}
                        cursor={{ fill: "rgba(75,79,224,0.06)" }}
                      />
                      <Bar dataKey="amount" radius={[0, 10, 10, 0]}>
                        {breakdown.map((b, i) => (
                          <Cell key={i} fill={b.color} stroke="none" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-36 h-36 shrink-0 relative">
                    <ResponsiveContainer>
                      <PieChart>
                        {spendChart === "3d" && (
                          <Pie
                            data={breakdown}
                            dataKey="amount"
                            nameKey="category"
                            innerRadius={39}
                            outerRadius={61}
                            paddingAngle={2}
                            startAngle={90}
                            endAngle={-270}
                            cy="55%"
                            isAnimationActive={false}
                          >
                            {breakdown.map((b, i) => (
                              <Cell key={`depth-${i}`} fill={shadeHex(b.color, -28)} stroke="none" />
                            ))}
                          </Pie>
                        )}

                        <Pie
                          data={breakdown}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={spendChart === "3d" ? 39 : 38}
                          outerRadius={spendChart === "3d" ? 61 : 58}
                          paddingAngle={2}
                          startAngle={90}
                          endAngle={-270}
                          cy={spendChart === "3d" ? "49%" : "50%"}
                        >
                          {breakdown.map((b, i) => (
                            <Cell key={i} fill={b.color} stroke="none" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {spendChart === "3d" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-ink-faint">Spent</div>
                        <div className="text-sm font-display font-bold">{formatCompactINR(totalSpend)}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {breakdown.slice(0, 5).map((b) => (
                      <div key={b.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: b.color }}
                          />
                          <span className="truncate">{b.category}</span>
                        </div>
                        <span className="text-ink-faint shrink-0 ml-2">
                          {totalSpend ? Math.round((Number(b.amount) / totalSpend) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </ClayCard>

        <ClayCard>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display font-semibold">Salary Growth</h3>
              <p className="text-xs text-ink-faint mt-1">Switch chart style anytime.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <ChartModeButton
              active={growthChart === "line"}
              onClick={() => setGrowthChart("line")}
              icon={<TrendingUp size={15} />}
              label="Line"
            />
            <ChartModeButton
              active={growthChart === "area"}
              onClick={() => setGrowthChart("area")}
              icon={<Waves size={15} />}
              label="Area"
            />
            <ChartModeButton
              active={growthChart === "bars"}
              onClick={() => setGrowthChart("bars")}
              icon={<ChartNoAxesColumnIncreasing size={15} />}
              label="Bars"
            />
          </div>

          {growth.length < 2 ? (
            <p className="text-sm text-ink-faint py-6 text-center">
              Add a few salary entries to see your trend.
            </p>
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                {growthChart === "bars" ? (
                  <BarChart data={growth}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                    <Tooltip formatter={(v: number) => formatCompactINR(Number(v))} labelFormatter={() => ""} />
                    <Bar dataKey="amount" fill="#4B4FE0" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : growthChart === "area" ? (
                  <AreaChart data={growth}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                    <Tooltip formatter={(v: number) => formatCompactINR(Number(v))} labelFormatter={() => ""} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#4B4FE0"
                      strokeWidth={3}
                      fill="#4B4FE0"
                      fillOpacity={0.16}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={growth}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                    <Tooltip formatter={(v: number) => formatCompactINR(Number(v))} labelFormatter={() => ""} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#4B4FE0"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-2">Cycle-End Prediction</h3>
          <p className="text-sm text-ink-faint mb-3">
            Based on your average spend of {prediction ? formatCompactINR(prediction.avgDailySpend) : "–"}/day
          </p>
          <div className="clay-inset px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Projected balance at cycle end</span>
            <Amount value={prediction?.predictedEndBalance ?? 0} size="sm" />
          </div>
        </ClayCard>

        <div className="grid grid-cols-2 gap-4">
          <Tool to="/budgets" icon={<Gauge size={18} />} title="Budgets" />
          <Tool to="/recurring" icon={<Repeat2 size={18} />} title="Recurring" />
          <Tool to="/emergency-fund" icon={<ShieldCheck size={18} />} title="Emergency Fund" />
          <Tool to="/debts" icon={<Landmark size={18} />} title="Debt & EMI" />
        </div>
      </div>
    </div>
  );
}

function ChartModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-clay-sm py-2.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all",
        active
          ? "bg-primary text-white shadow-clay-raised-sm"
          : "clay-surface-sm text-ink-soft"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="clay-surface-sm clay-pressable p-3 flex flex-col items-center text-center"
    >
      <span className="text-primary mb-1">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="clay-inset px-3 py-3 min-w-0">
      <div className="text-[11px] text-ink-faint mb-1">{label}</div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}

function Tool({ to, icon, title }: { to: string; icon: React.ReactNode; title: string }) {
  return (
    <Link to={to} className="clay-surface-sm clay-pressable p-4 flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </Link>
  );
}
