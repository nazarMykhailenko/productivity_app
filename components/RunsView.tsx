"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/stats";
import { parseDay } from "@/lib/deadlines";
import {
  byDayDesc,
  formatDistance,
  formatDuration,
  formatPaceWithUnit,
  isValidRun,
  pace,
  parseDuration,
  runSummary,
  toDistance,
  toMeters,
} from "@/lib/running";
import type { Run, RunUnit } from "@/lib/types";

const field =
  "h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3";

/** Runs listed before the "show all" toggle. */
const RECENT_SHOWN = 10;

export default function RunsView() {
  const { runs, runSettings, ready } = useStore();
  const { unit } = runSettings;

  const sorted = useMemo(() => [...runs].sort(byDayDesc), [runs]);
  const summary = useMemo(() => runSummary(runs, unit), [runs, unit]);

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="mt-1 text-sm text-ink-3">
            Log a run when you do one — rest days need no entry. Trends live on{" "}
            <Link href="/stats" className="text-ink-2 underline underline-offset-4 hover:text-ink">
              Stats
            </Link>
            .
          </p>
        </div>
        <UnitToggle unit={unit} />
      </div>

      <LogRunForm unit={unit} />

      {sorted.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
          <MiniTile
            label="This week"
            value={formatDistance(summary.week.meters, unit, 1)}
            hint={`${summary.week.runs} ${summary.week.runs === 1 ? "run" : "runs"}`}
          />
          <MiniTile
            label="Time this week"
            value={summary.week.seconds > 0 ? formatDuration(summary.week.seconds) : "—"}
            hint={summary.week.pace != null ? formatPaceWithUnit(summary.week.pace, unit) : "no runs"}
          />
        </section>
      )}

      <RunList runs={sorted} unit={unit} />
    </div>
  );
}

function MiniTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 truncate text-xs text-ink-3">{hint}</p>
    </div>
  );
}

function UnitToggle({ unit }: { unit: RunUnit }) {
  const { setRunUnit } = useStore();
  return (
    <div className="flex h-9 items-center gap-1 rounded-lg border border-edge bg-raised p-1">
      {(["km", "mi"] as const).map((u) => (
        <button
          key={u}
          onClick={() => setRunUnit(u)}
          aria-pressed={unit === u}
          aria-label={`Show distances in ${u === "km" ? "kilometres" : "miles"}`}
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

function LogRunForm({ unit }: { unit: RunUnit }) {
  const { addRun } = useStore();
  const today = dayKey(new Date());

  const [day, setDay] = useState(today);
  const [distance, setDistance] = useState("");
  const [time, setTime] = useState("");

  const meters = distance.trim() === "" ? NaN : toMeters(Number(distance), unit);
  const seconds = parseDuration(time);
  const valid = seconds != null && isValidRun(meters, seconds);

  // Live pace, so a mistyped time or distance is obvious before saving.
  const preview = valid ? pace(meters, seconds!, unit) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || seconds == null) return;
    addRun({ day, meters, seconds });
    setDistance("");
    setTime("");
    setDay(today);
  }

  const timeTouched = time.trim() !== "";
  const timeBad = timeTouched && seconds === null;

  return (
    <form onSubmit={submit} className="rounded-xl border border-edge bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">Log a run</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <div>
          <label htmlFor="run-distance" className="sr-only">
            Distance in {unit}
          </label>
          <div className="relative">
            <input
              id="run-distance"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="5.0"
              className={`${field} w-full pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3"
            >
              {unit}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="run-time" className="sr-only">
            Duration
          </label>
          <input
            id="run-time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            inputMode="numeric"
            placeholder="32:15"
            aria-invalid={timeBad}
            aria-describedby="run-time-hint"
            className={`${field} w-full ${timeBad ? "border-[#e66767]" : ""}`}
          />
        </div>

        <div>
          <label htmlFor="run-day" className="sr-only">
            Day
          </label>
          <input
            id="run-day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            type="date"
            max={today}
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Log run
        </button>
      </div>

      <p id="run-time-hint" className="mt-3 text-xs text-ink-3">
        {timeBad ? (
          <span className="text-[#e66767]">
            Time should be mm:ss, h:mm:ss, or plain minutes.
          </span>
        ) : preview != null ? (
          <span className="text-ink-2">
            That&rsquo;s {formatPaceWithUnit(preview, unit)}.
          </span>
        ) : (
          <>Time as 32:15, 1:05:30, or just 45 for minutes.</>
        )}
      </p>
    </form>
  );
}

function RunList({ runs, unit }: { runs: Run[]; unit: RunUnit }) {
  const [showAll, setShowAll] = useState(false);

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink">No runs logged yet</p>
        <p className="mt-1 text-sm text-ink-3">
          Add one above. Distance and time are all it needs — pace is worked out for you.
        </p>
      </div>
    );
  }

  const shown = showAll ? runs : runs.slice(0, RECENT_SHOWN);
  const hidden = runs.length - shown.length;

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
        {runs.length} {runs.length === 1 ? "run" : "runs"}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-edge bg-surface">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="px-4 py-3 text-left font-medium text-ink-3">Day</th>
              <th className="px-3 py-3 text-right font-medium text-ink-3">Distance</th>
              <th className="px-3 py-3 text-right font-medium text-ink-3">Time</th>
              <th className="px-3 py-3 text-right font-medium text-ink-3">Pace</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <RunRow key={r.id} run={r} unit={unit} />
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-ink-3 underline underline-offset-4 hover:text-ink"
        >
          Show {hidden} older {hidden === 1 ? "run" : "runs"}
        </button>
      )}
    </section>
  );
}

function RunRow({ run, unit }: { run: Run; unit: RunUnit }) {
  const { editRun, deleteRun } = useStore();
  const [editing, setEditing] = useState(false);
  const [distance, setDistance] = useState("");
  const [time, setTime] = useState("");

  const todayKey = dayKey(new Date());
  const p = pace(run.meters, run.seconds, unit);

  function startEdit() {
    setDistance(toDistance(run.meters, unit).toFixed(2));
    setTime(formatDuration(run.seconds));
    setEditing(true);
  }

  function commit() {
    const meters = distance.trim() === "" ? NaN : toMeters(Number(distance), unit);
    const seconds = parseDuration(time);
    if (seconds != null && isValidRun(meters, seconds)) editRun(run.id, { meters, seconds });
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-b border-edge last:border-b-0">
        <td className="px-4 py-2.5 text-ink-2">{dayLabel(run.day, todayKey)}</td>
        <td className="px-3 py-2.5 text-right">
          <input
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            type="number"
            step="0.01"
            min="0"
            aria-label={`Distance in ${unit}`}
            className="ml-auto block h-7 w-20 rounded border border-edge bg-raised px-2 text-right text-sm text-ink outline-none focus:border-ink-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </td>
        <td className="px-3 py-2.5 text-right">
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Duration"
            className="ml-auto block h-7 w-20 rounded border border-edge bg-raised px-2 text-right text-sm text-ink outline-none focus:border-ink-3"
          />
        </td>
        <td colSpan={2} className="px-3 py-2.5 text-right">
          <button
            onClick={commit}
            className="h-7 rounded-lg bg-ink px-3 text-xs font-medium text-[#0d0d0f] transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group border-b border-edge last:border-b-0">
      <td className="px-4 py-2.5 text-ink-2">{dayLabel(run.day, todayKey)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink">
        {formatDistance(run.meters, unit)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">
        {formatDuration(run.seconds)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">
        {p != null ? formatPaceWithUnit(p, unit) : "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={startEdit}
            aria-label={`Edit run on ${run.day}`}
            className="rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M11.5 2.5a1.4 1.4 0 012 2L5 13l-2.7.7L3 11l8.5-8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => deleteRun(run.id)}
            aria-label={`Delete run on ${run.day}`}
            className="rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767]"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.6 9h5.8l.6-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function dayLabel(day: string, todayKey: string): string {
  if (day === todayKey) return "Today";
  const d = parseDay(day);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}
