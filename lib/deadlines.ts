import { dayKey } from "./stats";
import type { Todo } from "./types";

/** Sorts after every real date, so undated tasks fall to the bottom. */
const NO_DUE = "9999-12-31";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(value: unknown): value is string {
  return typeof value === "string" && DAY_RE.test(value);
}

/** Parses YYYY-MM-DD at local midnight. `new Date(s)` would read it as UTC. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from the deadline to today; positive means late. */
export function daysLate(due: string, today: Date = new Date()): number {
  const deadline = parseDay(due);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Round rather than floor: a DST changeover makes some days 23 or 25 hours.
  return Math.round((midnight.getTime() - deadline.getTime()) / 86_400_000);
}

export type DueState = "overdue" | "today" | "tomorrow" | "future";

export function dueState(due: string, today: Date = new Date()): DueState {
  const late = daysLate(due, today);
  if (late > 0) return "overdue";
  if (late === 0) return "today";
  if (late === -1) return "tomorrow";
  return "future";
}

/** Plain calendar text for a deadline: "12 Aug", or "12 Aug 2027" across years. */
export function formatDueDate(due: string, today: Date = new Date()): string {
  const d = parseDay(due);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    // A bare "12 Aug" is ambiguous once the deadline crosses into another year.
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Compact badge text for an open task: "3d late", "Today", "Tomorrow", "12 Aug". */
export function dueText(due: string, today: Date = new Date()): string {
  const late = daysLate(due, today);
  if (late > 0) return `${late}d late`;
  if (late === 0) return "Today";
  if (late === -1) return "Tomorrow";
  return formatDueDate(due, today);
}

/** Whether a finished task was completed after its deadline. */
export function completedLate(todo: Todo): boolean {
  if (!todo.done || todo.due == null || !todo.completedAt) return false;
  return dayKey(todo.completedAt) > todo.due;
}

/** Spoken form for screen readers: "3 days late", "due today". */
export function dueSpoken(due: string, today: Date = new Date()): string {
  const late = daysLate(due, today);
  if (late > 0) return `${late} day${late === 1 ? "" : "s"} late`;
  if (late === 0) return "due today";
  if (late === -1) return "due tomorrow";
  return `due ${parseDay(due).toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;
}

/** A completed task is never overdue, however late it was finished. */
export function isOverdue(todo: Todo, todayKey: string): boolean {
  return !todo.done && todo.due != null && todo.due < todayKey;
}

/** Open tasks past their deadline, most overdue first. */
export function overdueTodos(todos: Todo[], today: Date = new Date()): Todo[] {
  const key = dayKey(today);
  return todos
    .filter((t) => isOverdue(t, key))
    .sort((a, b) => a.due!.localeCompare(b.due!));
}

export function dueTodayTodos(todos: Todo[], today: Date = new Date()): Todo[] {
  const key = dayKey(today);
  return todos.filter((t) => !t.done && t.due === key);
}

/** Open tasks carrying a deadline at all. */
export function scheduledTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => !t.done && t.due != null);
}

/** Soonest deadline first, undated last, then newest first. */
export function byDue(a: Todo, b: Todo): number {
  const d = (a.due ?? NO_DUE).localeCompare(b.due ?? NO_DUE);
  return d !== 0 ? d : (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

/** Drops deadlines that aren't a well-formed day, so bad data can't sort weirdly. */
export function normalizeTodos(todos: Todo[]): Todo[] {
  return todos.map((t) => ({ ...t, due: isValidDay(t.due) ? t.due : null }));
}
