"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { tint } from "@/lib/categories";
import { dayKey, isHabitDone } from "@/lib/stats";
import type { Habit, HabitKind } from "@/lib/types";

/** Monday-first week containing `anchor`, as 7 Dates. */
function weekOf(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7; // Mon=0 … Sun=6
  start.setDate(start.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function HabitsView() {
  const { habits, ready } = useStore();
  const [weekShift, setWeekShift] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const anchor = new Date();
  anchor.setDate(anchor.getDate() + weekShift * 7);
  const days = weekOf(anchor);
  const todayKey = dayKey(new Date());

  const rangeLabel = `${days[0].toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })} – ${days[6].toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90"
        >
          {showForm ? "Close" : "New habit"}
        </button>
      </div>

      {showForm && <AddHabitForm onDone={() => setShowForm(false)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2">{rangeLabel}</p>
        <div className="flex gap-1">
          <WeekButton label="←" title="Previous week" onClick={() => setWeekShift((w) => w - 1)} />
          <WeekButton
            label="Today"
            title="Jump to current week"
            onClick={() => setWeekShift(0)}
            disabled={weekShift === 0}
          />
          <WeekButton label="→" title="Next week" onClick={() => setWeekShift((w) => w + 1)} />
        </div>
      </div>

      {!ready ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface" aria-hidden />
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-edge bg-surface px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">No habits yet</p>
          <p className="mt-1 text-sm text-ink-3">
            Recurring activities you tick off each day — or log a number against a
            threshold, like “Read 20 pages”.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-edge bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="px-4 py-3 text-left font-medium text-ink-3">Habit</th>
                {days.map((d) => {
                  const key = dayKey(d);
                  const isToday = key === todayKey;
                  return (
                    <th
                      key={key}
                      className={`px-1 py-3 text-center font-medium ${
                        isToday ? "text-ink" : "text-ink-3"
                      }`}
                    >
                      <span className="block text-xs uppercase tracking-wider">
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span
                        className={`mx-auto mt-0.5 block w-7 rounded-full text-xs leading-5 ${
                          isToday ? "bg-raised" : ""
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right font-medium text-ink-3">Week</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <HabitRow key={h.id} habit={h} days={days} todayKey={todayKey} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WeekButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="h-8 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function AddHabitForm({ onDone }: { onDone: () => void }) {
  const { addHabit, categories } = useStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<HabitKind>("check");
  const [threshold, setThreshold] = useState("");
  const [unit, setUnit] = useState("");

  const valid =
    title.trim().length > 0 && (kind === "check" || Number(threshold) > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cat = category || categories[0]?.id;
    if (!valid || !cat) return;
    addHabit({
      title,
      category: cat,
      kind,
      threshold: kind === "number" ? Number(threshold) : null,
      unit,
    });
    onDone();
  }

  const field =
    "h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3";

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border border-edge bg-surface p-4 sm:grid-cols-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Habit, e.g. Morning stretch or Read pages"
        aria-label="Habit title"
        className={`${field} sm:col-span-2`}
        autoFocus
      />
      <select
        value={category || categories[0]?.id || ""}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="Category"
        className={field}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="flex h-10 items-center gap-1 rounded-lg border border-edge bg-raised p-1">
        {(["check", "number"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`h-full flex-1 rounded-md text-sm transition-colors ${
              kind === k ? "bg-surface text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {k === "check" ? "Tick" : "Number"}
          </button>
        ))}
      </div>
      {kind === "number" && (
        <>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Daily threshold, e.g. 20"
            aria-label="Daily threshold"
            type="number"
            min="0"
            step="any"
            className={field}
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit, e.g. pages, km (optional)"
            aria-label="Unit"
            className={field}
          />
        </>
      )}
      <div className="flex items-center justify-between sm:col-span-2">
        <p className="text-xs text-ink-3">
          {kind === "number"
            ? "Each day you log a number; it counts as done at or above the threshold."
            : "Each day gets a simple tick."}
        </p>
        <button
          type="submit"
          disabled={!valid}
          className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Create habit
        </button>
      </div>
    </form>
  );
}

function HabitRow({
  habit,
  days,
  todayKey,
}: {
  habit: Habit;
  days: Date[];
  todayKey: string;
}) {
  const { habitEntries, getCategory, editHabit, deleteHabit } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(habit.title);
  const cat = getCategory(habit.category);
  const entries = habitEntries[habit.id] ?? {};

  const doneCount = days.filter((d) => isHabitDone(habit, entries[dayKey(d)])).length;

  function commit() {
    editHabit(habit.id, { title: draft });
    setEditing(false);
  }

  return (
    <tr className="group border-b border-edge last:border-b-0">
      <td className="max-w-48 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: cat.color }} />
          {editing ? (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(habit.title);
                  setEditing(false);
                }
              }}
              autoFocus
              aria-label="Edit habit title"
              className="h-7 w-full rounded border border-edge bg-raised px-2 text-sm text-ink outline-none focus:border-ink-3"
            />
          ) : (
            <button
              onClick={() => {
                setDraft(habit.title);
                setEditing(true);
              }}
              className="truncate text-left text-ink hover:underline decoration-ink-3 underline-offset-4"
              title="Click to rename"
            >
              {habit.title}
            </button>
          )}
          <button
            onClick={() => deleteHabit(habit.id)}
            aria-label={`Delete habit “${habit.title}”`}
            className="ml-auto shrink-0 rounded p-1 text-ink-3 opacity-100 transition-opacity hover:bg-raised hover:text-[#e66767] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.6 9h5.8l.6-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {habit.kind === "number" && (
          <p className="mt-0.5 pl-3.5 text-xs text-ink-3">
            ≥ {habit.threshold} {habit.unit}
          </p>
        )}
      </td>
      {days.map((d) => {
        const key = dayKey(d);
        return (
          <td key={key} className={`px-1 py-2.5 text-center ${key === todayKey ? "bg-raised/40" : ""}`}>
            {habit.kind === "check" ? (
              <CheckCell habit={habit} day={key} value={entries[key]} color={cat.color} />
            ) : (
              <NumberCell habit={habit} day={key} value={entries[key]} color={cat.color} />
            )}
          </td>
        );
      })}
      <td className="px-3 py-2.5 text-right text-xs text-ink-3">
        <span className={doneCount > 0 ? "text-ink-2" : ""}>{doneCount}/7</span>
      </td>
    </tr>
  );
}

function CheckCell({
  habit,
  day,
  value,
  color,
}: {
  habit: Habit;
  day: string;
  value: number | boolean | undefined;
  color: string;
}) {
  const { toggleHabitDay } = useStore();
  const done = value === true;
  return (
    <button
      onClick={() => toggleHabitDay(habit.id, day)}
      aria-label={`${habit.title} on ${day}: ${done ? "done, click to clear" : "not done, click to tick"}`}
      className={`mx-auto grid size-6 place-items-center rounded-full border transition-colors ${
        done ? "border-transparent" : "border-edge hover:border-ink-3"
      }`}
      style={done ? { background: color } : undefined}
    >
      {done && (
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M2 5.5L4 7.5L8 3" stroke="#0d0d0f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function NumberCell({
  habit,
  day,
  value,
  color,
}: {
  habit: Habit;
  day: string;
  value: number | boolean | undefined;
  color: string;
}) {
  const { setHabitValue } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const num = typeof value === "number" ? value : undefined;
  const done = isHabitDone(habit, value);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") setHabitValue(habit.id, day, null);
    else {
      const v = Number(trimmed);
      if (Number.isFinite(v) && v >= 0) setHabitValue(habit.id, day, v);
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
        min="0"
        step="any"
        aria-label={`${habit.title} value on ${day}`}
        className="mx-auto h-7 w-14 rounded border border-edge bg-raised px-1 text-center text-sm text-ink outline-none focus:border-ink-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(num !== undefined ? String(num) : "");
        setEditing(true);
      }}
      aria-label={`${habit.title} on ${day}: ${
        num !== undefined ? `${num} ${habit.unit}` : "no value"
      }, click to edit`}
      className={`mx-auto grid h-6 min-w-9 place-items-center rounded-full border px-1.5 text-xs transition-colors ${
        num === undefined
          ? "border-edge text-ink-3 hover:border-ink-3"
          : done
            ? "border-transparent font-medium"
            : "border-edge text-ink-2"
      }`}
      style={done ? { background: tint(color, 0.18), color } : undefined}
    >
      {num !== undefined ? num : "–"}
    </button>
  );
}
