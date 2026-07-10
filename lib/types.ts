export interface Category {
  id: string; // URL-safe slug, unique
  label: string;
  color: string; // accent / chart series color
}

export interface Todo {
  id: string;
  title: string;
  category: string; // Category id
  done: boolean;
  createdAt: string; // ISO timestamp
  completedAt: string | null; // ISO timestamp, set when checked off
  due: string | null; // YYYY-MM-DD local day, or null when undated
}

export type HabitKind = "check" | "number";

export interface Habit {
  id: string;
  title: string;
  category: string; // Category id
  kind: HabitKind;
  threshold: number | null; // required for "number" habits: value that counts as done
  unit: string; // free text for "number" habits, e.g. "km", "pages"
  createdAt: string; // ISO timestamp
}

/** habitId -> YYYY-MM-DD -> true (check habits) or logged number (number habits) */
export type HabitEntries = Record<string, Record<string, number | boolean>>;

export type WeightUnit = "kg" | "lb";

/**
 * YYYY-MM-DD -> weight in kilograms. Always stored in kg regardless of the
 * display unit, so toggling units never reinterprets existing entries.
 */
export type WeightEntries = Record<string, number>;

export interface WeightSettings {
  unit: WeightUnit; // display only
  goal: number | null; // kilograms
}

export type MacroKey = "kcal" | "protein" | "carbs" | "fat";

/**
 * One day's food check-in. Fields are running totals for the day (kcal and
 * grams); null means "not logged", which is different from an explicit 0 on a
 * fasting day. `quality` is a 1–5 rating of how clean the day's food was.
 */
export interface DietEntry {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quality: number | null;
}

/** YYYY-MM-DD -> that day's totals. Stored days always have >= 1 field set. */
export type DietEntries = Record<string, DietEntry>;

/** Daily targets: kcal for "kcal", grams for the rest. */
export type DietTargets = Record<MacroKey, number>;

export interface DietSettings {
  targets: DietTargets;
}

export type RunUnit = "km" | "mi";

/**
 * One logged run. Distance is always metres and duration always seconds,
 * whatever the display unit — so switching km/mi never reinterprets old runs.
 * Runs are a list, not a per-day entry: rest days simply have none, and a
 * double day has two.
 */
export interface Run {
  id: string;
  day: string; // YYYY-MM-DD local day the run happened
  meters: number;
  seconds: number;
  createdAt: string; // ISO timestamp
}

export interface RunSettings {
  unit: RunUnit; // display only
}
