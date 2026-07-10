"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
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
import { tint } from "@/lib/categories";
import { GRID, INK2, MUTED, SERIES_1, SURFACE, axisTick } from "@/lib/chart";
import { ChartEmpty, StatTile } from "@/components/StatPrimitives";
import RunStats from "@/components/RunStats";
import WeightStats from "@/components/WeightStats";
import {
  daysLate,
  dueTodayTodos,
  overdueTodos,
  scheduledTodos,
} from "@/lib/deadlines";
import {
  completionsPerDay,
  dayKey,
  habitDoneCount,
  habitsDonePerDay,
  isHabitDone,
  last7Summary,
  streak,
  trailingDays,
} from "@/lib/stats";
import type { Category, Habit, Todo } from "@/lib/types";

const OVERDUE = "#e66767";
const DUE_TODAY = "#c98500";

/** Overdue tasks listed before collapsing into a "+N more" line. */
const OVERDUE_SHOWN = 6;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-edge bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload
        .filter((p) => Number(p.value) !== 0)
        .map((p) => (
          <p key={p.name} className="flex items-center gap-1.5 text-ink-2">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.name}: <span className="text-ink">{p.value}</span>
          </p>
        ))}
    </div>
  );
}

export default function StatsView() {
  const { todos, habits, habitEntries, categories, ready } = useStore();

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const daily = useMemo(
    () => completionsPerDay(todos, 30, categoryIds),
    [todos, categoryIds]
  );
  const week = useMemo(() => last7Summary(todos, categoryIds), [todos, categoryIds]);
  const currentStreak = useMemo(() => streak(todos), [todos]);
  const habitDaily = useMemo(
    () => habitsDonePerDay(habits, habitEntries, 30),
    [habits, habitEntries]
  );
  const habitWeek = useMemo(
    () => habits.reduce((sum, h) => sum + habitDoneCount(h, habitEntries, 7), 0),
    [habits, habitEntries]
  );
  const overdue = useMemo(() => overdueTodos(todos), [todos]);
  const dueToday = useMemo(() => dueTodayTodos(todos), [todos]);
  const scheduled = useMemo(() => scheduledTodos(todos), [todos]);
  const hasCompletions = daily.some((d) => d.total > 0);
  const hasHabitActivity = habitDaily.some((d) => d.done > 0);

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-24 animate-pulse rounded-xl bg-surface" />
        <div className="h-72 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>

      {/* Rolling 7-day summary + streak */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Last 7 days
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <StatTile label="Tasks done" value={week.total} />
          <StatTile
            label="Day streak"
            value={currentStreak}
            hint={currentStreak > 0 ? "consecutive days" : "complete a task to start"}
          />
          <StatTile
            label="Habit ticks"
            value={habitWeek}
            hint={habits.length > 0 ? `across ${habits.length} habit${habits.length === 1 ? "" : "s"}` : "no habits yet"}
          />
          {categories.map((c) => (
            <StatTile
              key={c.id}
              label={c.label}
              value={week.perCategory[c.id]}
              accent={c.color}
            />
          ))}
        </div>
      </section>

      {/* Deadlines: what has slipped, and what is about to */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Deadlines
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <StatTile
            label="Overdue"
            value={overdue.length}
            hint={overdue.length === 0 ? "nothing past due" : "open, past the deadline"}
            tone={overdue.length > 0 ? OVERDUE : undefined}
          />
          <StatTile
            label="Due today"
            value={dueToday.length}
            hint={dueToday.length === 0 ? "clear" : "still open"}
            tone={dueToday.length > 0 ? DUE_TODAY : undefined}
          />
          <StatTile
            label="Scheduled"
            value={scheduled.length}
            hint="open tasks with a deadline"
          />
        </div>
        {overdue.length > 0 && <OverdueList todos={overdue} />}
      </section>

      {/* Completions per day, stacked by category */}
      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">Tasks completed per day</h2>
          <span className="text-xs text-ink-3">Last 30 days, stacked by category</span>
        </div>
        {hasCompletions ? (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  {categories.map((c) => (
                    <Bar
                      key={c.id}
                      dataKey={(row: (typeof daily)[number]) => row.byCategory[c.id]}
                      name={c.label}
                      stackId="day"
                      fill={c.color}
                      stroke={SURFACE}
                      strokeWidth={1}
                      maxBarSize={18}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend categories={categories} />
          </>
        ) : (
          <ChartEmpty message="Check off a task and it will show up here." />
        )}
      </section>

      {/* Habits completed per day */}
      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-ink">Habits completed per day</h2>
          <span className="text-xs text-ink-3">
            Last 30 days · ticks plus number habits at threshold
          </span>
        </div>
        {hasHabitActivity ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitDaily} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
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
                  domain={[0, Math.max(habits.length, 1)]}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar
                  dataKey="done"
                  name="habits done"
                  fill={SERIES_1}
                  stroke={SURFACE}
                  strokeWidth={1}
                  maxBarSize={18}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ChartEmpty message="Tick a habit on the Habits page and it will show up here." />
        )}
      </section>

      {/* Per-habit detail */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
          Habit consistency
        </h2>
        {habits.length === 0 ? (
          <div className="rounded-xl border border-edge bg-surface p-5">
            <ChartEmpty message="Create a habit to track its consistency over time." />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {habits.map((h) => (
              <HabitCard key={h.id} habit={h} />
            ))}
          </div>
        )}
      </section>

      <RunStats />
      <WeightStats />
    </div>
  );
}

function OverdueList({ todos }: { todos: Todo[] }) {
  const { getCategory } = useStore();
  const shown = todos.slice(0, OVERDUE_SHOWN);
  const rest = todos.length - shown.length;

  return (
    <ul className="mt-3 divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-surface">
      {shown.map((t) => {
        const cat = getCategory(t.category);
        const late = daysLate(t.due!);
        return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: cat.color }}
            />
            <Link
              href={`/c/${encodeURIComponent(t.category)}`}
              className="flex-1 truncate text-sm text-ink hover:underline decoration-ink-3 underline-offset-4"
              title={`${t.title} — ${cat.label}`}
            >
              {t.title}
            </Link>
            <span className="shrink-0 text-xs tabular-nums" style={{ color: OVERDUE }}>
              {late} day{late === 1 ? "" : "s"} late
            </span>
          </li>
        );
      })}
      {rest > 0 && (
        <li className="px-4 py-2 text-xs text-ink-3">
          +{rest} more overdue {rest === 1 ? "task" : "tasks"}
        </li>
      )}
    </ul>
  );
}

function ChartLegend({ categories }: { categories: Category[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {categories.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span aria-hidden className="size-2 rounded-sm" style={{ background: c.color }} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const { habitEntries, getCategory } = useStore();
  const cat = getCategory(habit.category);
  const entries = habitEntries[habit.id] ?? {};
  const days = trailingDays(30);
  const doneCount = habitDoneCount(habit, habitEntries, 30);

  return (
    <div className="rounded-xl border border-edge bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: cat.color }} />
          {habit.title}
        </h3>
        <span className="text-xs text-ink-3">
          {habit.kind === "number" && `≥ ${habit.threshold} ${habit.unit} · `}
          {doneCount}/30 days
        </span>
      </div>

      {habit.kind === "check" ? (
        <div className="flex flex-wrap gap-1" aria-label={`${habit.title}, last 30 days`}>
          {days.map((d) => {
            const key = dayKey(d);
            const done = isHabitDone(habit, entries[key]);
            return (
              <span
                key={key}
                title={`${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${done ? "done" : "—"}`}
                className="h-6 w-3.5 rounded-sm"
                style={{ background: done ? cat.color : tint(cat.color, 0.08) }}
              />
            );
          })}
        </div>
      ) : (
        <NumberHabitChart habit={habit} color={cat.color} />
      )}
    </div>
  );
}

function NumberHabitChart({ habit, color }: { habit: Habit; color: string }) {
  const { habitEntries } = useStore();
  const entries = habitEntries[habit.id] ?? {};
  const data = trailingDays(30).map((d) => {
    const key = dayKey(d);
    const v = entries[key];
    return {
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: typeof v === "number" ? v : 0,
    };
  });
  const yMax = Math.max(habit.threshold ?? 0, ...data.map((r) => r.value));
  const hasValues = data.some((r) => r.value > 0);

  if (!hasValues) {
    return <ChartEmpty message="Log a value on the Habits page to start the chart." />;
  }

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
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
            domain={[0, Math.ceil(yMax * 1.1)]}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
          />
          {habit.threshold != null && (
            <ReferenceLine
              y={habit.threshold}
              stroke={INK2}
              strokeDasharray="4 4"
              label={{
                value: `threshold ${habit.threshold}`,
                position: "insideTopRight",
                fill: MUTED,
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            name={habit.unit || "value"}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: color, stroke: SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
