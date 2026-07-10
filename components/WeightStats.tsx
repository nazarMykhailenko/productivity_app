"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { GRID, INK2, MUTED, SERIES_1, SURFACE, axisTick } from "@/lib/chart";
import { ChartEmpty, StatTile } from "@/components/StatPrimitives";
import {
  TREND_WINDOW,
  formatDelta,
  formatWeight,
  round1,
  toDisplay,
  weightSeries,
  weightSummary,
} from "@/lib/weight";
import type { WeightUnit } from "@/lib/types";

const GOOD = "#199e70";
const BAD = "#e66767";
/** Daily readings: present but quiet. The trend is what the eye should follow. */
const RAW = "#7d7d86";

const RANGES = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
] as const;

/**
 * Colors a change by whether it moved toward the goal, not by its sign — up is
 * not universally bad. Neutral when no goal is set.
 */
function changeTone(
  change: number | null,
  trend: number | null,
  goal: number | null
): string | undefined {
  if (change == null || trend == null || goal == null) return undefined;
  const before = trend - change;
  const now = Math.abs(trend - goal);
  const then = Math.abs(before - goal);
  if (Math.abs(now - then) < 0.05) return undefined;
  return now < then ? GOOD : BAD;
}

export default function WeightStats() {
  const { weightEntries, weightSettings } = useStore();
  const [range, setRange] = useState<number>(RANGES[0].days);

  const { unit, goal } = weightSettings;
  const summary = useMemo(() => weightSummary(weightEntries), [weightEntries]);
  const points = useMemo(
    () => weightSeries(weightEntries, range),
    [weightEntries, range]
  );

  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Weight
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <StatTile
            label="Latest"
            value={summary.latest ? formatWeight(summary.latest.kg, unit) : "—"}
            hint={
              summary.latest
                ? summary.loggedToday
                  ? "this morning"
                  : new Date(`${summary.latest.day}T00:00:00`).toLocaleDateString(
                      undefined,
                      { day: "numeric", month: "short" }
                    )
                : "no weigh-ins yet"
            }
          />
          <StatTile
            label={`${TREND_WINDOW}-day average`}
            value={summary.trend != null ? formatWeight(summary.trend, unit) : "—"}
            hint="smoothed"
          />
          <StatTile
            label="Past week"
            value={summary.change7 != null ? formatDelta(summary.change7, unit) : "—"}
            hint="vs the week before"
            tone={changeTone(summary.change7, summary.trend, goal)}
          />
          <StatTile
            label="Past 30 days"
            value={summary.change30 != null ? formatDelta(summary.change30, unit) : "—"}
            hint="vs 30 days ago"
            tone={changeTone(summary.change30, summary.trend, goal)}
          />
          <StatTile
            label="Check-in streak"
            value={summary.streak}
            hint={`${summary.loggedLast30}/30 mornings logged`}
          />
          {goal != null && summary.trend != null && (
            <StatTile
              label="To goal"
              value={formatDelta(goal - summary.trend, unit)}
              hint={`goal ${formatWeight(goal, unit)}`}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink">Weight over time</h2>
            <span className="text-xs text-ink-3">
              Daily readings with the {TREND_WINDOW}-day average
            </span>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRange(r.days)}
                aria-pressed={range === r.days}
                className={`h-8 rounded-lg border px-3 text-sm transition-colors ${
                  range === r.days
                    ? "border-edge bg-raised text-ink"
                    : "border-transparent text-ink-3 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart points={points} unit={unit} goal={goal} range={range} />
      </section>
    </>
  );
}

interface ChartRow {
  label: string;
  full: string;
  value: number | null;
  trend: number | null;
}

function TrendChart({
  points,
  unit,
  goal,
  range,
}: {
  points: ReturnType<typeof weightSeries>;
  unit: WeightUnit;
  goal: number | null;
  range: number;
}) {
  const data: ChartRow[] = points.map((p) => ({
    label: p.label,
    full: p.full,
    value: p.value == null ? null : round1(toDisplay(p.value, unit)),
    trend: p.trend == null ? null : round1(toDisplay(p.trend, unit)),
  }));

  const logged = points.filter((p) => p.value != null).length;
  if (logged < 2) {
    return (
      <ChartEmpty
        message={
          logged === 0
            ? "No weigh-ins in this range — log one on the Weight tab."
            : "Log two mornings and the trend line appears here."
        }
      />
    );
  }

  const goalDisplay = goal == null ? null : round1(toDisplay(goal, unit));
  const values = data
    .flatMap((r) => [r.value, r.trend])
    .filter((v): v is number => v != null);
  if (goalDisplay != null) values.push(goalDisplay);

  // Weight never starts at zero, so pad a tight window around the real range.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, unit === "kg" ? 0.5 : 1);
  const domain: [number, number] = [
    Math.floor((min - pad) * 10) / 10,
    Math.ceil((max + pad) * 10) / 10,
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
            minTickGap={range > 90 ? 44 : 28}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            domain={domain}
            tickFormatter={(v: number) => v.toFixed(1)}
            width={48}
          />
          <Tooltip
            content={<WeightTooltip unit={unit} />}
            cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
          />
          {goalDisplay != null && (
            <ReferenceLine
              y={goalDisplay}
              stroke={INK2}
              strokeDasharray="4 4"
              label={{
                value: `goal ${goalDisplay.toFixed(1)}`,
                position: "insideTopRight",
                fill: MUTED,
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            name="weight"
            stroke={RAW}
            strokeWidth={1}
            connectNulls={false}
            dot={range <= 90 ? { r: 2, fill: RAW, stroke: SURFACE, strokeWidth: 1 } : false}
            activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name={`${TREND_WINDOW}-day average`}
            stroke={SERIES_1}
            strokeWidth={2.5}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | null; color?: string; payload?: ChartRow }[];
  unit?: WeightUnit;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink">{payload[0]?.payload?.full}</p>
      {rows.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-ink-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}:{" "}
          <span className="text-ink">
            {(p.value as number).toFixed(1)} {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
