"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dayKey, trailingDays } from "@/lib/stats";
import {
  TREND_WINDOW,
  formatDelta,
  formatWeight,
  isValidKg,
  round1,
  toDisplay,
  toKg,
  trendAt,
} from "@/lib/weight";
import type { WeightUnit } from "@/lib/types";

const GOOD = "#199e70";

const LOG_DAYS = 14;

const field =
  "h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3";

export default function WeightView() {
  const { weightSettings, ready } = useStore();
  const { unit } = weightSettings;

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
        <div className="h-20 animate-pulse rounded-xl bg-surface" />
        <div className="h-72 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weight</h1>
          <p className="mt-1 text-sm text-ink-3">
            One weigh-in each morning. The trend lives on{" "}
            <Link href="/stats" className="text-ink-2 underline underline-offset-4 hover:text-ink">
              Stats
            </Link>
            .
          </p>
        </div>
        <UnitToggle unit={unit} />
      </div>

      <CheckInCard unit={unit} />
      <GoalCard unit={unit} />
      <RecentLog unit={unit} />
    </div>
  );
}

function UnitToggle({ unit }: { unit: WeightUnit }) {
  const { setWeightUnit } = useStore();
  return (
    <div className="flex h-9 items-center gap-1 rounded-lg border border-edge bg-raised p-1">
      {(["kg", "lb"] as const).map((u) => (
        <button
          key={u}
          onClick={() => setWeightUnit(u)}
          aria-pressed={unit === u}
          aria-label={`Show weights in ${u === "kg" ? "kilograms" : "pounds"}`}
          className={`h-full w-11 rounded-md text-sm transition-colors ${
            unit === u ? "bg-surface text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function CheckInCard({ unit }: { unit: WeightUnit }) {
  const { weightEntries, setWeight } = useStore();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const now = new Date();
  const today = dayKey(now);
  const logged = weightEntries[today];
  const hour = now.getHours();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  // Compare against the trend as it stood before today, so today's own reading
  // isn't folded into the baseline it is measured against.
  const priorTrend = trendAt(weightEntries, yesterday);

  const lastKg = useMemo(() => {
    const days = Object.keys(weightEntries)
      .filter((d) => d !== today)
      .sort();
    const last = days[days.length - 1];
    return last ? weightEntries[last] : null;
  }, [weightEntries, today]);

  const missed = trailingDays(7).filter(
    (d) => dayKey(d) !== today && !(dayKey(d) in weightEntries)
  ).length;

  const parsed = Number(draft.trim());
  const valid = draft.trim() !== "" && isValidKg(toKg(parsed, unit));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setWeight(today, toKg(parsed, unit));
    setDraft("");
    setEditing(false);
  }

  if (typeof logged === "number" && !editing) {
    return (
      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-3">
              <span
                aria-hidden
                className="grid size-4 place-items-center rounded-full"
                style={{ background: GOOD }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5.5L4 7.5L8 3"
                    stroke="#0d0d0f"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Checked in today
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {formatWeight(logged, unit)}
            </p>
            {priorTrend != null && (
              <p className="mt-1 text-sm text-ink-3">
                {formatDelta(logged - priorTrend, unit)} vs the {TREND_WINDOW}-day
                average
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDraft(round1(toDisplay(logged, unit)).toString());
                setEditing(true);
              }}
              className="h-9 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
            >
              Edit
            </button>
            <button
              onClick={() => setWeight(today, null)}
              className="h-9 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767]"
            >
              Clear
            </button>
          </div>
        </div>
      </section>
    );
  }

  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const prompt = editing
    ? "Update today's weigh-in"
    : hour < 12
      ? `${greeting} — step on the scale`
      : "Today's check-in is still missing";

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{prompt}</p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft("");
                setEditing(false);
              }
            }}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            autoFocus={editing}
            placeholder={lastKg != null ? round1(toDisplay(lastKg, unit)).toFixed(1) : "0.0"}
            aria-label={`Weight this morning in ${unit}`}
            className={`${field} w-36 pr-9 text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3"
          >
            {unit}
          </span>
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {editing ? "Save" : "Log"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              setEditing(false);
            }}
            className="h-10 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            Cancel
          </button>
        )}
      </form>
      <p className="mt-3 text-xs text-ink-3">
        Weigh in right after waking, before eating or drinking — same conditions every
        day keeps the trend honest.
        {missed > 0 && (
          <>
            {" "}
            <span className="text-ink-2">
              {missed} of the last 7 mornings {missed === 1 ? "is" : "are"} unlogged.
            </span>
          </>
        )}
      </p>
    </section>
  );
}

function GoalCard({ unit }: { unit: WeightUnit }) {
  const { weightSettings, setWeightGoal } = useStore();
  const { goal } = weightSettings;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const parsed = Number(draft.trim());
  const valid = draft.trim() !== "" && isValidKg(toKg(parsed, unit));

  function commit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setWeightGoal(toKg(parsed, unit));
    setEditing(false);
  }

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      {editing ? (
        <form onSubmit={commit} className="flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            autoFocus
            placeholder={`Goal weight in ${unit}`}
            aria-label={`Goal weight in ${unit}`}
            className={`${field} w-44 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <button
            type="submit"
            disabled={!valid}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-10 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Goal</p>
            <p className="mt-1 text-sm text-ink">
              {goal != null ? formatWeight(goal, unit) : "Not set"}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setDraft(goal != null ? round1(toDisplay(goal, unit)).toString() : "");
                setEditing(true);
              }}
              className="h-8 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
            >
              {goal != null ? "Change" : "Set a goal"}
            </button>
            {goal != null && (
              <button
                onClick={() => setWeightGoal(null)}
                className="h-8 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentLog({ unit }: { unit: WeightUnit }) {
  const { weightEntries } = useStore();
  const today = dayKey(new Date());

  // Newest first: a log is read from the top.
  const days = useMemo(() => trailingDays(LOG_DAYS).reverse(), []);
  const sortedDays = useMemo(() => Object.keys(weightEntries).sort(), [weightEntries]);

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
        Last {LOG_DAYS} days
      </h2>
      <div className="overflow-x-auto rounded-xl border border-edge bg-surface">
        <table className="w-full min-w-[440px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="px-4 py-3 text-left font-medium text-ink-3">Day</th>
              <th className="px-3 py-3 text-right font-medium text-ink-3">Weight</th>
              <th className="px-3 py-3 text-right font-medium text-ink-3">Change</th>
              <th className="px-4 py-3 text-right font-medium text-ink-3">
                {TREND_WINDOW}-day avg
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const day = dayKey(d);
              const kg = weightEntries[day];
              const has = typeof kg === "number";

              const i = sortedDays.indexOf(day);
              const prevDay = i > 0 ? sortedDays[i - 1] : null;
              const delta = has && prevDay ? kg - weightEntries[prevDay] : null;

              const trend = trendAt(weightEntries, d);
              const isToday = day === today;

              return (
                <tr
                  key={day}
                  className={`border-b border-edge last:border-b-0 ${
                    isToday ? "bg-raised/40" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className={isToday ? "text-ink" : "text-ink-2"}>
                      {isToday
                        ? "Today"
                        : d.toLocaleDateString(undefined, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <WeightCell day={day} kg={has ? kg : undefined} unit={unit} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-ink-3">
                    {delta != null ? formatDelta(delta, unit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-ink-2">
                    {trend != null ? formatWeight(trend, unit) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Missed a morning? Click any day to fill it in.
      </p>
    </section>
  );
}

function WeightCell({
  day,
  kg,
  unit,
}: {
  day: string;
  kg: number | undefined;
  unit: WeightUnit;
}) {
  const { setWeight } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") setWeight(day, null);
    else {
      const v = toKg(Number(trimmed), unit);
      if (isValidKg(v)) setWeight(day, v);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        aria-label={`Weight on ${day} in ${unit}`}
        className="ml-auto block h-7 w-24 rounded border border-edge bg-raised px-2 text-right text-sm text-ink outline-none focus:border-ink-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(kg !== undefined ? round1(toDisplay(kg, unit)).toString() : "");
        setEditing(true);
      }}
      aria-label={`${day}: ${
        kg !== undefined ? formatWeight(kg, unit) : "not logged"
      }, click to edit`}
      className={`rounded px-2 py-0.5 tabular-nums transition-colors hover:bg-raised ${
        kg !== undefined ? "text-ink" : "text-ink-3"
      }`}
    >
      {kg !== undefined ? formatWeight(kg, unit) : "—"}
    </button>
  );
}
