import { dayKey, trailingDays } from "./stats";
import type { WeightEntries, WeightSettings, WeightUnit } from "./types";

const KG_PER_LB = 0.45359237;

/**
 * Days averaged into the trend line. Body weight swings a kilo or two on water
 * and gut content alone, so a single morning reading says very little; the
 * trailing mean is the number worth reacting to.
 */
export const TREND_WINDOW = 7;

/** Rejects typos and unit mix-ups (e.g. lb typed while kg is selected). */
export const MAX_KG = 500;

export const DEFAULT_WEIGHT_SETTINGS: WeightSettings = { unit: "kg", goal: null };

export function isValidKg(kg: number): boolean {
  return Number.isFinite(kg) && kg > 0 && kg <= MAX_KG;
}

export function toDisplay(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** e.g. "82.4 kg" */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplay(kg, unit).toFixed(1)} ${unit}`;
}

/** e.g. "+0.3 kg", "−0.6 kg", "0.0 kg" */
export function formatDelta(kgDelta: number, unit: WeightUnit): string {
  const v = toDisplay(kgDelta, unit);
  const sign = v > 0.05 ? "+" : v < -0.05 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(1)} ${unit}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/**
 * Mean of the weights logged in the TREND_WINDOW days ending at `date`, or
 * null if none were. Averaging whatever landed in the window (rather than the
 * last N readings) means a skipped morning widens the gap between samples
 * instead of silently dragging an old value forward.
 */
export function trendAt(entries: WeightEntries, date: Date): number | null {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < TREND_WINDOW; i++) {
    const v = entries[dayKey(addDays(date, -i))];
    if (typeof v === "number") {
      sum += v;
      n += 1;
    }
  }
  return n === 0 ? null : sum / n;
}

export interface WeightPoint {
  day: string; // YYYY-MM-DD
  label: string; // axis label, e.g. "9 Jul"
  full: string; // tooltip label, e.g. "Thu 9 Jul"
  value: number | null; // kg logged that morning
  trend: number | null; // kg, trailing mean
}

/** Trailing `days` days (oldest first, ending today), with raw and trend kg. */
export function weightSeries(entries: WeightEntries, days: number): WeightPoint[] {
  return trailingDays(days).map((d) => {
    const day = dayKey(d);
    const v = entries[day];
    return {
      day,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      full: d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      value: typeof v === "number" ? v : null,
      trend: trendAt(entries, d),
    };
  });
}

/** Consecutive days logged, ending today — or yesterday, if today is still open. */
export function checkInStreak(entries: WeightEntries): number {
  const cursor = new Date();
  if (!(dayKey(cursor) in entries)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dayKey(cursor) in entries) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export interface WeightSummary {
  latest: { day: string; kg: number } | null;
  trend: number | null; // current trailing mean
  change7: number | null; // trend now minus trend a week ago
  change30: number | null;
  streak: number;
  loggedLast30: number;
  loggedToday: boolean;
}

export function weightSummary(entries: WeightEntries): WeightSummary {
  const today = new Date();
  const days = Object.keys(entries).sort(); // YYYY-MM-DD sorts chronologically
  const lastDay = days[days.length - 1];

  // Deltas come off the trend, not the raw readings: comparing two noisy
  // mornings measures hydration more than it measures progress.
  const trend = trendAt(entries, today);
  const trend7 = trendAt(entries, addDays(today, -7));
  const trend30 = trendAt(entries, addDays(today, -30));

  return {
    latest: lastDay ? { day: lastDay, kg: entries[lastDay] } : null,
    trend,
    change7: trend != null && trend7 != null ? trend - trend7 : null,
    change30: trend != null && trend30 != null ? trend - trend30 : null,
    streak: checkInStreak(entries),
    loggedLast30: trailingDays(30).filter((d) => dayKey(d) in entries).length,
    loggedToday: dayKey(today) in entries,
  };
}

export function sanitizeWeightEntries(raw: unknown): WeightEntries {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: WeightEntries = {};
  for (const [day, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof v === "number" && isValidKg(v)) {
      out[day] = v;
    }
  }
  return out;
}

export function sanitizeWeightSettings(raw: unknown): WeightSettings {
  const out = { ...DEFAULT_WEIGHT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return out;
  const s = raw as Partial<WeightSettings>;
  if (s.unit === "kg" || s.unit === "lb") out.unit = s.unit;
  if (typeof s.goal === "number" && isValidKg(s.goal)) out.goal = s.goal;
  return out;
}
