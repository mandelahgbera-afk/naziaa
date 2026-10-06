"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/catalog";

/* 14-day revenue as soft columns; hover a day for its total. */
export function RevenueSpark({ days }: { days: { day: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const shown = hover ?? days.length - 1;
  const label = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="mt-4">
      <p className="text-sm text-ink-soft">
        <span className="font-serif text-2xl text-ink">{formatNaira(days[shown].total)}</span> · {label(days[shown].day)}
      </p>
      <div className="mt-4 flex h-40 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${label(d.day)}: ${formatNaira(d.total)}`}
            className="group relative flex h-full flex-1 items-end"
          >
            <span
              className={`w-full rounded-t-[6px] transition-colors ${i === shown ? "bg-amber" : "bg-sand group-hover:bg-honey"}`}
              style={{ height: `${Math.max(3, (d.total / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{label(days[0].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
