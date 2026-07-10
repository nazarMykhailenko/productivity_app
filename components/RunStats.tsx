"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { GRID, MUTED, SURFACE, axisTick } from "@/lib/chart";
import { ChartEmpty, StatTile } from "@/components/StatPrimitives";
import {
  dailyTotals,
  formatDistance,
  formatDuration,
  formatPace,
  formatPaceWithUnit,
  pace,
  runSummary,
  toDistance,
  type DayTotal,
} from "@/lib/running";
import type { RunUnit } from "@/lib/types";

const RUN = "#199e70";

const RANGES = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

export default function RunStats() {
  const { runs, runSettings } = useStore();
  const { unit } = runSettings;
  const [range, setRange] = useState<number>(RANGES[0].days);

  const summary = useMemo(() => runSummary(runs, unit), [runs, unit]);
  const days = useMemo(() => dailyTotals(runs, range, unit), [runs, range, unit]);

  const hasRuns = runs.length > 0;
  const longestPace =
    summary.longest && pace(summary.longest.meters, summary.longest.seconds, unit);
  const fastestPace =
    summary.fastest && pace(summary.fastest.meters, summary.fastest.seconds, unit);

  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Running
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <StatTile
            label="This week"
            value={formatDistance(summary.week.meters, unit, 1)}
            hint={`${summary.week.runs} ${summary.week.runs === 1 ? "run" : "runs"}`}
          />
          <StatTile
            label="Time this week"
            value={summary.week.seconds > 0 ? formatDuration(summary.week.seconds) : "—"}
            hint={
              summary.week.pace != null
                ? `${formatPaceWithUnit(summary.week.pace, unit)} average`
                : "no runs yet"
            }
          />
          <StatTile
            label="Last 30 days"
            value={formatDistance(summary.month.meters, unit, 1)}
            hint={`${summary.activeDays30} of 30 days active`}
          />
          <StatTile
            label="Longest run"
            value={summary.longest ? formatDistance(summary.longest.meters, unit, 1) : "—"}
            hint={
              longestPace != null ? `${formatPaceWithUnit(longestPace, unit)} · 30 days` : "30 days"
            }
          />
          <StatTile
            label="Fastest pace"
            value={fastestPace != null ? formatPace(fastestPace) : "—"}
            hint={
              summary.fastest
                ? `per ${unit} · ${formatDistance(summary.fastest.meters, unit, 1)}`
                : "30 days"
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink">Distance per day</h2>
            <span className="text-xs text-ink-3">Rest days show no bar</span>
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
        {!hasRuns ? (
          <ChartEmpty message="Log a run and your distance shows up here." />
        ) : days.every((d) => d.runs === 0) ? (
          <ChartEmpty message="No runs in this range." />
        ) : (
          <DistanceChart days={days} unit={unit} range={range} />
        )}
      </section>

      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">Pace trend</h2>
          <span className="text-xs text-ink-3">
            Minutes per {unit} · lower is faster · gaps are rest days
          </span>
        </div>
        <PaceChart days={days} unit={unit} range={range} />
      </section>
    </>
  );
}

function DistanceChart({
  days,
  unit,
  range,
}: {
  days: DayTotal[];
  unit: RunUnit;
  range: number;
}) {
  const data = days.map((d) => ({
    label: d.label,
    full: d.full,
    distance: Number(toDistance(d.meters, unit).toFixed(2)),
    seconds: d.seconds,
    runs: d.runs,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
            minTickGap={range > 30 ? 44 : 28}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => String(v)}
          />
          <Tooltip
            content={<RunTooltip unit={unit} />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar
            dataKey="distance"
            name="distance"
            fill={RUN}
            stroke={SURFACE}
            strokeWidth={1}
            maxBarSize={18}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaceChart({ days, unit, range }: { days: DayTotal[]; unit: RunUnit; range: number }) {
  // A rest day has no pace at all. Feeding it 0 would draw a line plunging to
  // an infinitely fast run; null leaves an honest gap.
  const data = days.map((d) => ({
    label: d.label,
    full: d.full,
    pace: d.pace,
    distance: Number(toDistance(d.meters, unit).toFixed(2)),
    seconds: d.seconds,
    runs: d.runs,
  }));

  const paces = data.map((d) => d.pace).filter((p): p is number => p != null);
  if (paces.length < 2) {
    return (
      <ChartEmpty
        message={
          paces.length === 0
            ? "No runs in this range."
            : "Log a second run and the pace trend appears here."
        }
      />
    );
  }

  // Pace never starts at zero, so pad a tight window around the real range.
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const padding = Math.max((max - min) * 0.15, 10);
  const domain: [number, number] = [Math.floor(min - padding), Math.ceil(max + padding)];

  return (
    <div className="mt-2 h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -6, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
            minTickGap={range > 30 ? 44 : 28}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            domain={domain}
            width={48}
            // Faster runs sit lower on a pace axis, which reads backwards; flip
            // it so "better" is up, the direction every other chart here uses.
            reversed
            tickFormatter={(v: number) => formatPace(v)}
          />
          <Tooltip
            content={<RunTooltip unit={unit} />}
            cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey="pace"
            name="pace"
            stroke={RUN}
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 2.5, fill: RUN, stroke: SURFACE, strokeWidth: 1 }}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipRow {
  full: string;
  distance: number;
  seconds: number;
  runs: number;
  pace?: number | null;
}

function RunTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload?: TooltipRow }[];
  unit?: RunUnit;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink">{row.full}</p>
      {row.runs === 0 ? (
        <p className="text-ink-3">Rest day</p>
      ) : (
        <>
          <p className="text-ink-2">
            Distance: <span className="text-ink">{row.distance.toFixed(2)} {unit}</span>
          </p>
          <p className="text-ink-2">
            Time: <span className="text-ink">{formatDuration(row.seconds)}</span>
          </p>
          {row.pace != null && (
            <p className="text-ink-2">
              Pace: <span className="text-ink">{formatPace(row.pace)} /{unit}</span>
            </p>
          )}
          {row.runs > 1 && <p className="mt-1 text-ink-3">{row.runs} runs combined</p>}
        </>
      )}
    </div>
  );
}
