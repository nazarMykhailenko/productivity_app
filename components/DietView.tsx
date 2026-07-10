"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { dayKey, trailingDays } from "@/lib/stats";
import {
  EMPTY_DIET_ENTRY,
  MACROS,
  QUALITY_LEVELS,
  formatAmount,
  isValidAmount,
  isValidTarget,
  qualityLevel,
} from "@/lib/diet";
import type { DietEntry, DietTargets, MacroKey } from "@/lib/types";

const LOG_DAYS = 14;
/** Calories run past the target: worth flagging, unlike the other macros. */
const OVER = "#e66767";

const field =
  "h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3";
const numberField = `${field} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

export default function DietView() {
  const { dietSettings, ready } = useStore();

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
        <div className="h-20 animate-pulse rounded-xl bg-surface" />
        <div className="h-72 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diet</h1>
        <p className="mt-1 text-sm text-ink-3">
          Log the day&apos;s totals as you go. Trends live on{" "}
          <Link href="/stats" className="text-ink-2 underline underline-offset-4 hover:text-ink">
            Stats
          </Link>
          .
        </p>
      </div>

      <CheckInCard targets={dietSettings.targets} />
      <TargetsCard targets={dietSettings.targets} />
      <RecentLog targets={dietSettings.targets} />
    </div>
  );
}

function CheckInCard({ targets }: { targets: DietTargets }) {
  const { dietEntries, setDietEntry, clearDietDay } = useStore();
  const [editing, setEditing] = useState(false);

  const today = dayKey(new Date());
  const entry = dietEntries[today];

  if (entry && !editing) {
    return (
      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Today so far
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="h-9 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
            >
              Update
            </button>
            <button
              onClick={() => clearDietDay(today)}
              className="h-9 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767]"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {MACROS.map((m) => (
            <MacroProgress
              key={m.key}
              macroKey={m.key}
              value={entry[m.key]}
              target={targets[m.key]}
            />
          ))}
        </div>
        <QualityRow
          value={entry.quality}
          onChange={(q) => setDietEntry(today, { quality: q })}
        />
      </section>
    );
  }

  return (
    <CheckInForm
      entry={entry ?? EMPTY_DIET_ENTRY}
      editing={editing}
      onDone={() => setEditing(false)}
    />
  );
}

function MacroProgress({
  macroKey,
  value,
  target,
}: {
  macroKey: MacroKey;
  value: number | null;
  target: number;
}) {
  const meta = MACROS.find((m) => m.key === macroKey)!;
  const over = macroKey === "kcal" && value != null && value > target;
  const pct = value == null ? 0 : Math.min((value / target) * 100, 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ink-2">
          <span aria-hidden className="mr-1.5">{meta.emoji}</span>
          {meta.label}
        </span>
        <span className="tabular-nums text-ink" style={over ? { color: OVER } : undefined}>
          {value != null ? formatAmount(value) : "—"}
          <span className="text-ink-3"> / {formatAmount(target)} {meta.unit}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-label={`${meta.label}: ${value != null ? formatAmount(value) : "not logged"} of ${formatAmount(target)} ${meta.unit}`}
        aria-valuenow={value ?? 0}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: over ? OVER : meta.color }}
        />
      </div>
    </div>
  );
}

function QualityRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (q: number | null) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-edge pt-4">
      <span className="text-sm text-ink-2">Food quality</span>
      <div className="ml-auto flex gap-1" role="group" aria-label="Food quality today">
        {QUALITY_LEVELS.map((q) => {
          const active = value === q.value;
          return (
            <button
              key={q.value}
              onClick={() => onChange(active ? null : q.value)}
              aria-pressed={active}
              title={q.label}
              className={`h-8 rounded-lg border px-2.5 text-sm transition-colors ${
                active
                  ? "border-edge bg-raised text-ink"
                  : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: q.color, opacity: active || value == null ? 1 : 0.35 }}
                />
                {q.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckInForm({
  entry,
  editing,
  onDone,
}: {
  entry: DietEntry;
  editing: boolean;
  onDone: () => void;
}) {
  const { setDietEntry } = useStore();
  const today = dayKey(new Date());

  const [drafts, setDrafts] = useState<Record<MacroKey, string>>(() =>
    Object.fromEntries(
      MACROS.map((m) => [m.key, entry[m.key] != null ? String(entry[m.key]) : ""])
    ) as Record<MacroKey, string>
  );
  const [quality, setQuality] = useState<number | null>(entry.quality);

  const parsed = Object.fromEntries(
    MACROS.map((m) => {
      const raw = drafts[m.key].trim();
      return [m.key, raw === "" ? null : Number(raw)];
    })
  ) as Record<MacroKey, number | null>;

  const invalid = MACROS.filter(
    (m) => parsed[m.key] != null && !isValidAmount(m.key, parsed[m.key]!)
  );
  const hasAnything =
    quality != null || MACROS.some((m) => parsed[m.key] != null);
  const valid = invalid.length === 0 && hasAnything;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setDietEntry(today, { ...parsed, quality });
    onDone();
  }

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
        {editing ? "Update today's totals" : "How did you eat today?"}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACROS.map((m) => (
            <label key={m.key} className="block">
              <span className="mb-1.5 block text-xs text-ink-3">
                <span aria-hidden className="mr-1">{m.emoji}</span>
                {m.label} ({m.unit})
              </span>
              <input
                value={drafts[m.key]}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [m.key]: e.target.value }))
                }
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                placeholder="0"
                aria-label={`${m.label} today in ${m.unit}`}
                className={`${numberField} w-full`}
              />
            </label>
          ))}
        </div>
        <QualityRow value={quality} onChange={setQuality} />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!valid}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {editing ? "Save" : "Log today"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={onDone}
              className="h-10 rounded-lg border border-edge px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <p className="mt-3 text-xs text-ink-3">
        Log running totals whenever — leave a field empty if you didn&apos;t track it.
      </p>
    </section>
  );
}

function TargetsCard({ targets }: { targets: DietTargets }) {
  const { setDietTargets } = useStore();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<MacroKey, string>>(
    () =>
      Object.fromEntries(MACROS.map((m) => [m.key, String(targets[m.key])])) as Record<
        MacroKey,
        string
      >
  );

  const parsed = Object.fromEntries(
    MACROS.map((m) => [m.key, Number(drafts[m.key].trim())])
  ) as Record<MacroKey, number>;
  const valid = MACROS.every(
    (m) => drafts[m.key].trim() !== "" && isValidTarget(m.key, parsed[m.key])
  );

  function commit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setDietTargets(parsed);
    setEditing(false);
  }

  if (editing) {
    return (
      <section className="rounded-xl border border-edge bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
          Daily targets
        </p>
        <form onSubmit={commit} className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MACROS.map((m) => (
              <label key={m.key} className="block">
                <span className="mb-1.5 block text-xs text-ink-3">
                  {m.label} ({m.unit})
                </span>
                <input
                  value={drafts[m.key]}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [m.key]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  aria-label={`${m.label} target in ${m.unit}`}
                  className={`${numberField} w-full`}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
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
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Daily targets
          </p>
          <p className="mt-1 text-sm text-ink">
            {MACROS.map((m, i) => (
              <span key={m.key}>
                {i > 0 && <span className="text-ink-3"> · </span>}
                {formatAmount(targets[m.key])} {m.unit === "g" ? `g ${m.label.toLowerCase()}` : m.unit}
              </span>
            ))}
          </p>
        </div>
        <button
          onClick={() => {
            setDrafts(
              Object.fromEntries(
                MACROS.map((m) => [m.key, String(targets[m.key])])
              ) as Record<MacroKey, string>
            );
            setEditing(true);
          }}
          className="ml-auto h-8 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
        >
          Change
        </button>
      </div>
    </section>
  );
}

function RecentLog({ targets }: { targets: DietTargets }) {
  const { dietEntries } = useStore();
  const today = dayKey(new Date());
  const days = trailingDays(LOG_DAYS).reverse(); // newest first: a log is read from the top

  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
        Last {LOG_DAYS} days
      </h2>
      <div className="overflow-x-auto rounded-xl border border-edge bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="px-4 py-3 text-left font-medium text-ink-3">Day</th>
              {MACROS.map((m) => (
                <th key={m.key} className="px-3 py-3 text-right font-medium text-ink-3">
                  <span aria-hidden className="mr-1">{m.emoji}</span>
                  {m.unit === "g" ? m.label : m.unit}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-ink-3">Quality</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const day = dayKey(d);
              const entry = dietEntries[day] ?? EMPTY_DIET_ENTRY;
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
                  {MACROS.map((m) => (
                    <td key={m.key} className="px-3 py-2.5 text-right">
                      <MacroCell
                        day={day}
                        macroKey={m.key}
                        value={entry[m.key]}
                        over={m.key === "kcal" && (entry.kcal ?? 0) > targets.kcal}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">
                    <QualityCell day={day} value={entry.quality} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Missed a day? Click any cell to fill it in.
      </p>
    </section>
  );
}

function MacroCell({
  day,
  macroKey,
  value,
  over,
}: {
  day: string;
  macroKey: MacroKey;
  value: number | null;
  over: boolean;
}) {
  const { setDietEntry } = useStore();
  const meta = MACROS.find((m) => m.key === macroKey)!;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") setDietEntry(day, { [macroKey]: null });
    else {
      const v = Number(trimmed);
      if (isValidAmount(macroKey, v)) setDietEntry(day, { [macroKey]: v });
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
        min="0"
        step="1"
        aria-label={`${meta.label} on ${day} in ${meta.unit}`}
        className="ml-auto block h-7 w-20 rounded border border-edge bg-raised px-2 text-right text-sm text-ink outline-none focus:border-ink-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value != null ? String(value) : "");
        setEditing(true);
      }}
      aria-label={`${meta.label} on ${day}: ${
        value != null ? `${formatAmount(value)} ${meta.unit}` : "not logged"
      }, click to edit`}
      className={`rounded px-2 py-0.5 tabular-nums transition-colors hover:bg-raised ${
        value != null ? "text-ink" : "text-ink-3"
      }`}
      style={over && value != null ? { color: OVER } : undefined}
    >
      {value != null ? formatAmount(value) : "—"}
    </button>
  );
}

function QualityCell({ day, value }: { day: string; value: number | null }) {
  const { setDietEntry } = useStore();
  const level = qualityLevel(value);

  return (
    <span className="inline-flex items-center gap-1.5">
      {level && (
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ background: level.color }}
        />
      )}
      <select
        value={value ?? ""}
        onChange={(e) =>
          setDietEntry(day, {
            quality: e.target.value === "" ? null : Number(e.target.value),
          })
        }
        aria-label={`Food quality on ${day}`}
        className={`cursor-pointer appearance-none rounded bg-transparent px-1 py-0.5 text-right text-sm outline-none transition-colors hover:bg-raised focus:bg-raised ${
          level ? "text-ink" : "text-ink-3"
        }`}
      >
        <option value="">—</option>
        {QUALITY_LEVELS.map((q) => (
          <option key={q.value} value={q.value}>
            {q.label}
          </option>
        ))}
      </select>
    </span>
  );
}
