import { dayKey, trailingDays } from "./stats";
import type { Run, RunSettings, RunUnit } from "./types";

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

/** Rejects typos: longer than any ultra, or longer than a day on foot. */
export const MAX_METERS = 500_000;
export const MAX_SECONDS = 24 * 3600;

export const DEFAULT_RUN_SETTINGS: RunSettings = { unit: "km" };

export function metersPerUnit(unit: RunUnit): number {
  return unit === "km" ? METERS_PER_KM : METERS_PER_MILE;
}

export function toDistance(meters: number, unit: RunUnit): number {
  return meters / metersPerUnit(unit);
}

export function toMeters(value: number, unit: RunUnit): number {
  return value * metersPerUnit(unit);
}

export function isValidRun(meters: number, seconds: number): boolean {
  return (
    Number.isFinite(meters) &&
    meters > 0 &&
    meters <= MAX_METERS &&
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds <= MAX_SECONDS
  );
}

/**
 * Parses a run duration. Accepts `mm:ss` ("32:15"), `h:mm:ss` ("1:05:30"), and a
 * bare number read as minutes ("45", "32.5"). Returns whole seconds, or null if
 * the text isn't a duration — an out-of-range segment like "32:75" is a typo,
 * not 33:15, so it's rejected rather than silently carried.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  if (/^\d+(\.\d+)?$/.test(s)) {
    const seconds = Math.round(Number(s) * 60);
    return seconds > 0 && seconds <= MAX_SECONDS ? seconds : null;
  }

  const parts = s.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.every((p) => /^\d+$/.test(p))) return null;

  const nums = parts.map(Number);
  // Every segment but the leading one is a clock field: 0–59.
  if (nums.slice(1).some((n) => n > 59)) return null;

  const seconds =
    parts.length === 2 ? nums[0] * 60 + nums[1] : nums[0] * 3600 + nums[1] * 60 + nums[2];

  return seconds > 0 && seconds <= MAX_SECONDS ? seconds : null;
}

/** "32:15", or "1:05:30" once past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "5.20 km" */
export function formatDistance(meters: number, unit: RunUnit, digits = 2): string {
  return `${toDistance(meters, unit).toFixed(digits)} ${unit}`;
}

/** Seconds per km/mi, or null when there's no distance to divide by. */
export function pace(meters: number, seconds: number, unit: RunUnit): number | null {
  if (!(meters > 0) || !(seconds > 0)) return null;
  return seconds / toDistance(meters, unit);
}

/** "5:23" — minutes and seconds per unit, minutes unbounded. */
export function formatPace(secondsPerUnit: number): string {
  const s = Math.round(secondsPerUnit);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** "5:23 /km" */
export function formatPaceWithUnit(secondsPerUnit: number, unit: RunUnit): string {
  return `${formatPace(secondsPerUnit)} /${unit}`;
}

/** Newest run first; ties broken by entry order so a double day stays stable. */
export function byDayDesc(a: Run, b: Run): number {
  const d = b.day.localeCompare(a.day);
  return d !== 0 ? d : (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

export interface DayTotal {
  day: string; // YYYY-MM-DD
  label: string; // "9 Jul"
  full: string; // "Thu 9 Jul"
  meters: number; // 0 on a rest day
  seconds: number;
  runs: number;
  /** Seconds per unit for the day's combined distance; null on a rest day. */
  pace: number | null;
}

/**
 * Per-day totals across the trailing `days` days. Rest days are present with
 * zero distance and a null pace — a blank day is a real fact about the week, but
 * it is not a run at infinite pace.
 */
export function dailyTotals(runs: Run[], days: number, unit: RunUnit): DayTotal[] {
  const byDay = new Map<string, { meters: number; seconds: number; runs: number }>();
  for (const r of runs) {
    const acc = byDay.get(r.day) ?? { meters: 0, seconds: 0, runs: 0 };
    acc.meters += r.meters;
    acc.seconds += r.seconds;
    acc.runs += 1;
    byDay.set(r.day, acc);
  }

  return trailingDays(days).map((d) => {
    const day = dayKey(d);
    const acc = byDay.get(day);
    return {
      day,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      full: d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      meters: acc?.meters ?? 0,
      seconds: acc?.seconds ?? 0,
      runs: acc?.runs ?? 0,
      pace: acc ? pace(acc.meters, acc.seconds, unit) : null,
    };
  });
}

/** Runs inside the trailing `days` days (including today). */
export function runsInWindow(runs: Run[], days: number, today: Date = new Date()): Run[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const from = dayKey(cutoff);
  const to = dayKey(today);
  return runs.filter((r) => r.day >= from && r.day <= to);
}

export interface WindowTotals {
  meters: number;
  seconds: number;
  runs: number;
  /** Combined pace over the window; null when nothing was run. */
  pace: number | null;
}

export function windowTotals(runs: Run[], unit: RunUnit): WindowTotals {
  let meters = 0;
  let seconds = 0;
  for (const r of runs) {
    meters += r.meters;
    seconds += r.seconds;
  }
  return { meters, seconds, runs: runs.length, pace: pace(meters, seconds, unit) };
}

export interface RunSummary {
  week: WindowTotals;
  month: WindowTotals;
  /** Longest single run in the last 30 days, by distance. */
  longest: Run | null;
  /** Fastest single run in the last 30 days, by pace. */
  fastest: Run | null;
  lastRun: Run | null;
  /** Days in the last 30 with at least one run. */
  activeDays30: number;
}

export function runSummary(runs: Run[], unit: RunUnit, today: Date = new Date()): RunSummary {
  const last7 = runsInWindow(runs, 7, today);
  const last30 = runsInWindow(runs, 30, today);

  const longest = last30.reduce<Run | null>(
    (best, r) => (best === null || r.meters > best.meters ? r : best),
    null
  );

  // Pace is seconds per unit, so lower is faster. Runs shorter than 400 m are
  // excluded: a sprint's pace is real but flatters the number meaninglessly.
  const fastest = last30
    .filter((r) => r.meters >= 400)
    .reduce<Run | null>((best, r) => {
      const p = pace(r.meters, r.seconds, unit);
      const bp = best ? pace(best.meters, best.seconds, unit) : null;
      if (p == null) return best;
      return bp == null || p < bp ? r : best;
    }, null);

  const lastRun = runs.reduce<Run | null>(
    (latest, r) => (latest === null || byDayDesc(r, latest) < 0 ? r : latest),
    null
  );

  return {
    week: windowTotals(last7, unit),
    month: windowTotals(last30, unit),
    longest,
    fastest,
    lastRun,
    activeDays30: new Set(last30.map((r) => r.day)).size,
  };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeRuns(raw: unknown): Run[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is Run =>
      typeof r === "object" &&
      r !== null &&
      typeof r.id === "string" &&
      typeof r.day === "string" &&
      DAY_RE.test(r.day) &&
      typeof r.meters === "number" &&
      typeof r.seconds === "number" &&
      isValidRun(r.meters, r.seconds)
  );
}

export function sanitizeRunSettings(raw: unknown): RunSettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_RUN_SETTINGS };
  const s = raw as Partial<RunSettings>;
  return { unit: s.unit === "mi" ? "mi" : "km" };
}
