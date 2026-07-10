import type { Habit, HabitEntries, Todo } from "./types";

/** Local-timezone YYYY-MM-DD for an ISO timestamp or Date. */
export function dayKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DailyRow {
  day: string; // YYYY-MM-DD
  label: string; // short display label, e.g. "9 Jul"
  total: number;
  byCategory: Record<string, number>;
}

/** Completions per day for the trailing `days` days (including today). */
export function completionsPerDay(
  todos: Todo[],
  days: number,
  categoryIds: string[]
): DailyRow[] {
  const rows = new Map<string, DailyRow>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    rows.set(key, {
      day: key,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      total: 0,
      byCategory: Object.fromEntries(categoryIds.map((id) => [id, 0])),
    });
  }
  for (const t of todos) {
    if (!t.done || !t.completedAt) continue;
    const row = rows.get(dayKey(t.completedAt));
    if (!row) continue;
    row.total += 1;
    if (t.category in row.byCategory) row.byCategory[t.category] += 1;
  }
  return [...rows.values()];
}

/** Tasks completed in the trailing 7 days, total and per category. */
export function last7Summary(todos: Todo[], categoryIds: string[]) {
  const rows = completionsPerDay(todos, 7, categoryIds);
  const perCategory: Record<string, number> = Object.fromEntries(
    categoryIds.map((id) => [id, 0])
  );
  let total = 0;
  for (const r of rows) {
    total += r.total;
    for (const id of categoryIds) perCategory[id] += r.byCategory[id];
  }
  return { total, perCategory };
}

/** Trailing `days` Dates (oldest first, ending today). */
export function trailingDays(days: number): Date[] {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return d;
  });
}

/** Whether a habit counts as done for a given entry value. */
export function isHabitDone(
  habit: Habit,
  entry: number | boolean | undefined
): boolean {
  if (entry === undefined) return false;
  if (habit.kind === "check") return entry === true;
  return typeof entry === "number" && habit.threshold != null && entry >= habit.threshold;
}

export interface HabitDailyRow {
  day: string; // YYYY-MM-DD
  label: string;
  done: number; // habits completed that day
}

/** Habits completed per day for the trailing `days` days. */
export function habitsDonePerDay(
  habits: Habit[],
  entries: HabitEntries,
  days: number
): HabitDailyRow[] {
  return trailingDays(days).map((d) => {
    const key = dayKey(d);
    return {
      day: key,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      done: habits.filter((h) => isHabitDone(h, entries[h.id]?.[key])).length,
    };
  });
}

/** Done-days count for one habit over the trailing `days` days. */
export function habitDoneCount(
  habit: Habit,
  entries: HabitEntries,
  days: number
): number {
  const forHabit = entries[habit.id] ?? {};
  return trailingDays(days).filter((d) => isHabitDone(habit, forHabit[dayKey(d)]))
    .length;
}

/** Consecutive days (ending today or yesterday) with >= 1 completion. */
export function streak(todos: Todo[]): number {
  const doneDays = new Set(
    todos.filter((t) => t.done && t.completedAt).map((t) => dayKey(t.completedAt!))
  );
  if (doneDays.size === 0) return 0;
  const cursor = new Date();
  // A streak is still alive if today has no completion yet but yesterday does.
  if (!doneDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (doneDays.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
