"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { GRID, INK2, MUTED, SURFACE, axisTick } from "@/lib/chart";
import { ChartEmpty, StatTile } from "@/components/StatPrimitives";
import {
  MACROS,
  QUALITY_LEVELS,
  dietSeries,
  dietSummary,
  formatAmount,
  qualityLevel,
} from "@/lib/diet";
const OVER = "#e66767";
const QUALITY_EMPTY = "rgba(255,255,255,0.06)";

const RANGES = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

const KCAL = MACROS.find((m) => m.key === "kcal")!;
const GRAM_MACROS = MACROS.filter((m) => m.key !== "kcal");

export default function DietStats() {
  const { dietEntries, dietSettings } = useStore();
  const [range, setRange] = useState<number>(RANGES[0].days);

  const { targets } = dietSettings;
  const summary = useMemo(
    () => dietSummary(dietEntries, targets),
    [dietEntries, targets]
  );
  const points = useMemo(() => dietSeries(dietEntries, range), [dietEntries, range]);
  const logged = points.filter((p) => p.kcal != null).length;

  const avgQuality = summary.avgQuality7;
  const avgQualityLevel = qualityLevel(avgQuality == null ? null : Math.round(avgQuality));

  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Diet
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <StatTile
            label="Today"
            value={
              summary.today?.kcal != null
                ? `${formatAmount(summary.today.kcal)} kcal`
                : "—"
            }
            hint={`target ${formatAmount(targets.kcal)} kcal`}
            tone={
              summary.today?.kcal != null && summary.today.kcal > targets.kcal
                ? OVER
                : undefined
            }
          />
          <StatTile
            label="Avg calories (7d)"
            value={
              summary.avg7.kcal != null ? `${formatAmount(summary.avg7.kcal)} kcal` : "—"
            }
            hint="days logged only"
          />
          <StatTile
            label="Avg protein (7d)"
            value={
              summary.avg7.protein != null
                ? `${formatAmount(summary.avg7.protein)} g`
                : "—"
            }
            hint={`target ${formatAmount(targets.protein)} g`}
          />
          <StatTile
            label="Protein target hit"
            value={`${summary.proteinHit7}/7`}
            hint="days this week"
          />
          <StatTile
            label="Food quality (7d)"
            value={avgQuality != null ? avgQuality.toFixed(1) : "—"}
            hint={avgQualityLevel ? avgQualityLevel.label.toLowerCase() : "out of 5"}
            tone={avgQualityLevel?.color}
          />
          <StatTile
            label="Check-in streak"
            value={summary.streak}
            hint={`${summary.loggedLast30}/30 days logged`}
          />
        </div>
      </section>

      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink">Calories per day</h2>
            <span className="text-xs text-ink-3">
              Against the {formatAmount(targets.kcal)} kcal target
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
        {logged === 0 ? (
          <ChartEmpty message="No check-ins in this range — log a day on the Diet tab." />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 12, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<DietTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <ReferenceLine
                  y={targets.kcal}
                  stroke={INK2}
                  strokeDasharray="4 4"
                  label={{
                    value: `target ${formatAmount(targets.kcal)}`,
                    position: "insideTopRight",
                    fill: MUTED,
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="kcal"
                  name="kcal"
                  fill={KCAL.color}
                  stroke={SURFACE}
                  strokeWidth={1}
                  maxBarSize={18}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">Macros per day</h2>
          <span className="text-xs text-ink-3">
            Last {range} days · grams, stacked
          </span>
        </div>
        {points.every((p) => p.protein == null && p.carbs == null && p.fat == null) ? (
          <ChartEmpty message="Log protein, carbs, or fat and the breakdown appears here." />
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={points}
                  margin={{ top: 12, right: 4, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<DietTooltip unit="g" />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  {GRAM_MACROS.map((m) => (
                    <Bar
                      key={m.key}
                      dataKey={m.key}
                      name={m.label.toLowerCase()}
                      stackId="day"
                      fill={m.color}
                      stroke={SURFACE}
                      strokeWidth={1}
                      maxBarSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {GRAM_MACROS.map((m) => (
                <span key={m.key} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span aria-hidden className="size-2 rounded-sm" style={{ background: m.color }} />
                  {m.label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <QualityStrip />
    </>
  );
}

function QualityStrip() {
  const { dietEntries } = useStore();
  const points = useMemo(() => dietSeries(dietEntries, 30), [dietEntries]);
  const rated = points.filter((p) => p.quality != null).length;

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-ink">Food quality</h2>
        <span className="text-xs text-ink-3">Last 30 days · {rated}/30 rated</span>
      </div>
      {rated === 0 ? (
        <ChartEmpty message="Rate a day on the Diet tab and it will show up here." />
      ) : (
        <>
          <div className="flex flex-wrap gap-1" aria-label="Food quality, last 30 days">
            {points.map((p) => {
              const level = qualityLevel(p.quality);
              return (
                <span
                  key={p.day}
                  title={`${p.full}: ${level ? level.label : "not rated"}`}
                  className="h-6 w-3.5 rounded-sm"
                  style={{ background: level ? level.color : QUALITY_EMPTY }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {QUALITY_LEVELS.map((q) => (
              <span key={q.value} className="flex items-center gap-1.5 text-xs text-ink-2">
                <span aria-hidden className="size-2 rounded-sm" style={{ background: q.color }} />
                {q.label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DietTooltip({
  active,
  payload,
  unit = "kcal",
}: {
  active?: boolean;
  payload?: {
    name?: string;
    value?: number | null;
    color?: string;
    payload?: { full: string };
  }[];
  unit?: string;
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
            {formatAmount(p.value as number)} {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
