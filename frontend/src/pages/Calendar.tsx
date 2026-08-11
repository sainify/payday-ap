import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { api } from "@/lib/api";
import { toISODate } from "@/lib/cycle";
import clsx from "clsx";

interface CalendarEvent {
  date: string;
  type: "bill" | "salary" | "goal";
  title: string;
  amount: number;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState(toISODate(new Date()));

  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    api.get<{ events: CalendarEvent[] }>(`/calendar?month=${monthKey}`).then((r) => setEvents(r.events)).catch(() => setEvents([]));
  }, [monthKey]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), d)));
    }
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      map[e.date] = map[e.date] || [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const dotColor: Record<string, string> = { bill: "bg-amber", salary: "bg-mint", goal: "bg-primary" };

  return (
    <div className="pb-28">
      <TopBar title="Financial Calendar" back />
      <div className="px-5 space-y-4">
        <ClayCard>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="h-9 w-9 rounded-clay-sm clay-surface-sm clay-pressable flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <div className="font-display font-semibold">
              {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="h-9 w-9 rounded-clay-sm clay-surface-sm clay-pressable flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-faint mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelected(day)}
                className={clsx(
                  "aspect-square rounded-clay-sm flex flex-col items-center justify-center text-xs relative",
                  !day && "invisible",
                  day === selected && "bg-primary text-white font-semibold",
                  day !== selected && day === toISODate(new Date()) && "clay-inset font-semibold"
                )}
              >
                {day && Number(day.slice(-2))}
                {day && eventsByDay[day] && (
                  <div className="flex gap-0.5 mt-0.5">
                    {eventsByDay[day].slice(0, 3).map((e, j) => (
                      <span key={j} className={clsx("h-1 w-1 rounded-full", dotColor[e.type])} />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </ClayCard>

        <ClayCard>
          <h3 className="font-display font-semibold mb-3">
            {new Date(selected).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
          </h3>
          {(eventsByDay[selected]?.length ?? 0) === 0 && (
            <p className="text-sm text-ink-faint py-2">Nothing scheduled this day.</p>
          )}
          <div className="space-y-2">
            {eventsByDay[selected]?.map((e, i) => (
              <div key={i} className="flex items-center justify-between clay-inset px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={clsx("h-2 w-2 rounded-full", dotColor[e.type])} />
                  {e.title}
                </div>
                <Amount value={e.amount} size="sm" />
              </div>
            ))}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
