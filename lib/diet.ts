import { dayKey, trailingDays } from "./stats";
import type {
  DietEntries,
  DietEntry,
  DietSettings,
  DietTargets,
  MacroKey,
} from "./types";

export interface MacroMeta {
  key: MacroKey;
  label: string;
  emoji: string;
  unit: string; // display unit for amounts
  color: string; // chart series / progress bar color
}

/** The four tracked macros, in display order. */
export const MACROS: MacroMeta[] = [
  { key: "kcal", label: "Calories", emoji: "🔥", unit: "kcal", color: "#3987e5" },
  { key: "protein", label: "Protein", emoji: "💪", unit: "g", color: "#199e70" },
  { key: "carbs", label: "Carbs", emoji: "🍞", unit: "g", color: "#c98500" },
  { key: "fat", label: "Fat", emoji: "🧈", unit: "g", color: "#a06ee0" },
];

export const MACRO_KEYS = MACROS.map((m) => m.key);

/** Rejects typos: nobody eats 25,000 kcal or 3 kg of protein in a day. */
export const MACRO_MAX: DietTargets = {
  kcal: 20000,
  protein: 2000,
  carbs: 2000,
  fat: 2000,
};

export const DEFAULT_DIET_SETTINGS: DietSettings = {
  targets: { kcal: 1900, protein: 140, carbs: 165, fat: 55 },
};

export interface QualityLevel {
  value: number;
  label: string;
  color: string;
}

/** 1–5 rating of how clean the day's food was, worst to best. */
export const QUALITY_LEVELS: QualityLevel[] = [
  { value: 1, label: "Poor", color: "#e66767" },
  { value: 2, label: "Fair", color: "#d98a3f" },
  { value: 3, label: "OK", color: "#c9b04a" },
  { value: 4, label: "Good", color: "#6fae5b" },
  { value: 5, label: "Great", color: "#199e70" },
];

export function qualityLevel(value: number | null): QualityLevel | null {
  return QUALITY_LEVELS.find((q) => q.value === value) ?? null;
}

export const EMPTY_DIET_ENTRY: DietEntry = {
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
  quality: null,
};

/** Amounts allow 0 — a fasted macro is a real data point, unlike a target. */
export function isValidAmount(key: MacroKey, v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= MACRO_MAX[key];
}

export function isValidTarget(key: MacroKey, v: number): boolean {
  return Number.isFinite(v) && v > 0 && v <= MACRO_MAX[key];
}

export function isValidQuality(v: number): boolean {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

export function isEmptyDietEntry(e: DietEntry): boolean {
  return (
    e.kcal === null &&
    e.protein === null &&
    e.carbs === null &&
    e.fat === null &&
    e.quality === null
  );
}

/** Drops invalid fields rather than the whole entry. */
export function sanitizeDietEntry(raw: unknown): DietEntry {
  const out = { ...EMPTY_DIET_ENTRY };
  if (typeof raw !== "object" || raw === null) return out;
  const e = raw as Partial<DietEntry>;
  for (const key of MACRO_KEYS) {
    const v = e[key];
    if (typeof v === "number" && isValidAmount(key, v)) out[key] = v;
  }
  if (typeof e.quality === "number" && isValidQuality(e.quality)) {
    out.quality = e.quality;
  }
  return out;
}

export function sanitizeDietEntries(raw: unknown): DietEntries {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: DietEntries = {};
  for (const [day, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const entry = sanitizeDietEntry(v);
    if (!isEmptyDietEntry(entry)) out[day] = entry;
  }
  return out;
}

export function sanitizeDietSettings(raw: unknown): DietSettings {
  const out: DietSettings = {
    targets: { ...DEFAULT_DIET_SETTINGS.targets },
  };
  if (typeof raw !== "object" || raw === null) return out;
  const targets = (raw as Partial<DietSettings>).targets;
  if (typeof targets === "object" && targets !== null) {
    for (const key of MACRO_KEYS) {
      const v = (targets as Partial<DietTargets>)[key];
      if (typeof v === "number" && isValidTarget(key, v)) out.targets[key] = v;
    }
  }
  return out;
}

/** e.g. "1,900" for kcal, "140" for grams. */
export function formatAmount(v: number): string {
  return Math.round(v).toLocaleString();
}

export interface DietPoint {
  day: string; // YYYY-MM-DD
  label: string; // axis label, e.g. "9 Jul"
  full: string; // tooltip label, e.g. "Thu 9 Jul"
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quality: number | null;
}

/** Trailing `days` days (oldest first, ending today). */
export function dietSeries(entries: DietEntries, days: number): DietPoint[] {
  return trailingDays(days).map((d) => {
    const day = dayKey(d);
    const e = entries[day] ?? EMPTY_DIET_ENTRY;
    return {
      day,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      full: d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      kcal: e.kcal,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      quality: e.quality,
    };
  });
}

/** Consecutive days logged, ending today — or yesterday, if today is still open. */
export function dietStreak(entries: DietEntries): number {
  const cursor = new Date();
  if (!(dayKey(cursor) in entries)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dayKey(cursor) in entries) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export interface DietSummary {
  today: DietEntry | null;
  /** Mean over the last-7-days entries where that macro was logged. */
  avg7: Record<MacroKey, number | null>;
  avgQuality7: number | null;
  /** Days in the last 7 where logged protein met the target. */
  proteinHit7: number;
  streak: number;
  loggedLast30: number;
  loggedToday: boolean;
}

export function dietSummary(entries: DietEntries, targets: DietTargets): DietSummary {
  const today = dayKey(new Date());
  const last7 = trailingDays(7).map((d) => entries[dayKey(d)]);

  const avg7 = {} as Record<MacroKey, number | null>;
  for (const key of MACRO_KEYS) {
    const values = last7
      .map((e) => e?.[key])
      .filter((v): v is number => typeof v === "number");
    avg7[key] =
      values.length === 0
        ? null
        : values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  const qualities = last7
    .map((e) => e?.quality)
    .filter((v): v is number => typeof v === "number");

  return {
    today: entries[today] ?? null,
    avg7,
    avgQuality7:
      qualities.length === 0
        ? null
        : qualities.reduce((sum, v) => sum + v, 0) / qualities.length,
    proteinHit7: last7.filter((e) => (e?.protein ?? -1) >= targets.protein).length,
    streak: dietStreak(entries),
    loggedLast30: trailingDays(30).filter((d) => dayKey(d) in entries).length,
    loggedToday: today in entries,
  };
}
