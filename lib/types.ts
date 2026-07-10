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
