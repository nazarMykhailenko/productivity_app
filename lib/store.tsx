"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, slugify } from "./categories";
import { isValidDay, normalizeTodos } from "./deadlines";
import {
  DEFAULT_WEIGHT_SETTINGS,
  isValidKg,
  sanitizeWeightEntries,
  sanitizeWeightSettings,
} from "./weight";
import {
  DEFAULT_RUN_SETTINGS,
  isValidRun,
  sanitizeRunSettings,
  sanitizeRuns,
} from "./running";
import {
  DEFAULT_DIET_SETTINGS,
  isEmptyDietEntry,
  sanitizeDietEntries,
  sanitizeDietEntry,
  sanitizeDietSettings,
} from "./diet";
import type {
  Category,
  DietEntries,
  DietEntry,
  DietSettings,
  DietTargets,
  Habit,
  HabitEntries,
  HabitKind,
  Run,
  RunSettings,
  RunUnit,
  Todo,
  WeightEntries,
  WeightSettings,
  WeightUnit,
} from "./types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Store {
  todos: Todo[];
  habits: Habit[];
  habitEntries: HabitEntries;
  weightEntries: WeightEntries;
  weightSettings: WeightSettings;
  runs: Run[];
  runSettings: RunSettings;
  dietEntries: DietEntries;
  dietSettings: DietSettings;
  categories: Category[];
  /** Lookup by id; use getCategory() for a safe fallback. */
  categoryMap: Record<string, Category>;
  getCategory: (id: string) => Category;
  ready: boolean;

  addTodo: (title: string, category: string, due?: string | null) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  editTodo: (id: string, title: string) => void;
  /** Set or clear a task's deadline (YYYY-MM-DD); null clears it. */
  setTodoDue: (id: string, due: string | null) => void;

  addHabit: (h: {
    title: string;
    category: string;
    kind: HabitKind;
    threshold: number | null;
    unit: string;
  }) => void;
  editHabit: (
    id: string,
    patch: Partial<Pick<Habit, "title" | "category" | "threshold" | "unit">>
  ) => void;
  deleteHabit: (id: string) => void;
  /** Toggle a check habit for a day. */
  toggleHabitDay: (habitId: string, day: string) => void;
  /** Set a number habit's value for a day; null clears the entry. */
  setHabitValue: (habitId: string, day: string, value: number | null) => void;

  /** Record a morning weigh-in, in kilograms; null clears the day. */
  setWeight: (day: string, kg: number | null) => void;
  /** Display unit only — entries stay in kilograms. */
  setWeightUnit: (unit: WeightUnit) => void;
  /** Target weight in kilograms; null clears it. */
  setWeightGoal: (kg: number | null) => void;

  /** Log a run: metres and seconds, on a YYYY-MM-DD day. */
  addRun: (run: { day: string; meters: number; seconds: number }) => void;
  editRun: (id: string, patch: Partial<Pick<Run, "day" | "meters" | "seconds">>) => void;
  deleteRun: (id: string) => void;
  /** Display unit only — runs stay in metres. */
  setRunUnit: (unit: RunUnit) => void;

  /**
   * Merge a partial food check-in into a day; null fields clear that macro,
   * and a day with nothing left is removed entirely.
   */
  setDietEntry: (day: string, patch: Partial<DietEntry>) => void;
  /** Remove a day's food check-in. */
  clearDietDay: (day: string) => void;
  /** Update one or more daily macro targets. */
  setDietTargets: (patch: Partial<DietTargets>) => void;

  addCategory: (label: string, color: string) => void;
  editCategory: (id: string, patch: Partial<Pick<Category, "label" | "color">>) => void;
  /** Removes the category; its todos and habits move to the first remaining one. */
  deleteCategory: (id: string) => void;

  /** Serialize all app data as pretty-printed JSON for backup. */
  exportData: () => string;
  /** Replace all app data from a backup; returns false if the JSON is invalid. */
  importData: (json: string) => boolean;
}

interface Backup {
  version: number;
  exportedAt: string;
  todos: Todo[];
  categories: Category[];
  // Added in version 2; absent from v1 backups.
  habits?: Habit[];
  habitEntries?: HabitEntries;
  // Added in version 4; absent from v1–v3 backups.
  weightEntries?: WeightEntries;
  weightSettings?: WeightSettings;
  // Added in version 6; absent from v1–v5 backups.
  runs?: Run[];
  runSettings?: RunSettings;
  // Added in version 7; absent from v1–v6 backups.
  dietEntries?: DietEntries;
  dietSettings?: DietSettings;
  // Present in v1/v2 backups (goals feature, since removed); ignored on import.
  goals?: unknown;
}

function isValidBackup(v: unknown): v is Backup {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Partial<Backup>;
  return (
    Array.isArray(b.todos) &&
    b.todos.every((t) => typeof t?.id === "string" && typeof t?.title === "string") &&
    Array.isArray(b.categories) &&
    b.categories.length > 0 &&
    b.categories.every(
      (c) => typeof c?.id === "string" && typeof c?.label === "string" && typeof c?.color === "string"
    ) &&
    (b.habits === undefined ||
      (Array.isArray(b.habits) &&
        b.habits.every((h) => typeof h?.id === "string" && typeof h?.title === "string"))) &&
    (b.habitEntries === undefined ||
      (typeof b.habitEntries === "object" && b.habitEntries !== null)) &&
    // Shape only; sanitizeWeight* drops individual bad days and settings.
    (b.weightEntries === undefined ||
      (typeof b.weightEntries === "object" &&
        b.weightEntries !== null &&
        !Array.isArray(b.weightEntries))) &&
    (b.weightSettings === undefined ||
      (typeof b.weightSettings === "object" && b.weightSettings !== null)) &&
    (b.runs === undefined || Array.isArray(b.runs)) &&
    (b.runSettings === undefined ||
      (typeof b.runSettings === "object" && b.runSettings !== null)) &&
    // Shape only; sanitizeDiet* drops individual bad days and settings.
    (b.dietEntries === undefined ||
      (typeof b.dietEntries === "object" &&
        b.dietEntries !== null &&
        !Array.isArray(b.dietEntries))) &&
    (b.dietSettings === undefined ||
      (typeof b.dietSettings === "object" && b.dietSettings !== null))
  );
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [rawTodos, setTodos, todosReady] = useLocalStorage<Todo[]>("pt:todos", []);
  const [habits, setHabits, habitsReady] = useLocalStorage<Habit[]>("pt:habits", []);
  const [habitEntries, setHabitEntries, entriesReady] = useLocalStorage<HabitEntries>(
    "pt:habitEntries",
    {}
  );
  const [categories, setCategories, categoriesReady] = useLocalStorage<Category[]>(
    "pt:categories",
    DEFAULT_CATEGORIES
  );
  const [weightEntries, setWeightEntries, weightReady] = useLocalStorage<WeightEntries>(
    "pt:weightEntries",
    {}
  );
  const [weightSettings, setWeightSettings, weightSettingsReady] =
    useLocalStorage<WeightSettings>("pt:weightSettings", DEFAULT_WEIGHT_SETTINGS);
  const [runs, setRuns, runsReady] = useLocalStorage<Run[]>("pt:runs", []);
  const [runSettings, setRunSettings, runSettingsReady] = useLocalStorage<RunSettings>(
    "pt:runSettings",
    DEFAULT_RUN_SETTINGS
  );
  const [dietEntries, setDietEntries, dietReady] = useLocalStorage<DietEntries>(
    "pt:dietEntries",
    {}
  );
  const [dietSettings, setDietSettings, dietSettingsReady] =
    useLocalStorage<DietSettings>("pt:dietSettings", DEFAULT_DIET_SETTINGS);

  // Tasks saved before deadlines existed carry no `due` key at all; normalize on
  // read so nothing downstream has to cope with undefined.
  const todos = useMemo(() => normalizeTodos(rawTodos), [rawTodos]);

  const store = useMemo<Store>(() => {
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    return {
      todos,
      habits,
      habitEntries,
      weightEntries,
      weightSettings,
      runs,
      runSettings,
      dietEntries,
      dietSettings,
      categories,
      categoryMap,
      getCategory: (id) => categoryMap[id] ?? FALLBACK_CATEGORY,
      ready:
        todosReady &&
        habitsReady &&
        entriesReady &&
        categoriesReady &&
        weightReady &&
        weightSettingsReady &&
        runsReady &&
        runSettingsReady &&
        dietReady &&
        dietSettingsReady,

      addTodo(title, category, due = null) {
        const t = title.trim();
        if (!t) return;
        setTodos((prev) => [
          {
            id: uid(),
            title: t,
            category,
            done: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
            due: isValidDay(due) ? due : null,
          },
          ...prev,
        ]);
      },

      toggleTodo(id) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  done: !t.done,
                  completedAt: !t.done ? new Date().toISOString() : null,
                }
              : t
          )
        );
      },

      deleteTodo(id) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      },

      editTodo(id, title) {
        const t = title.trim();
        if (!t) return;
        setTodos((prev) => prev.map((x) => (x.id === id ? { ...x, title: t } : x)));
      },

      setTodoDue(id, due) {
        const value = isValidDay(due) ? due : null;
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, due: value } : t)));
      },

      addHabit({ title, category, kind, threshold, unit }) {
        const t = title.trim();
        if (!t) return;
        if (kind === "number" && !(threshold != null && threshold > 0)) return;
        setHabits((prev) => [
          ...prev,
          {
            id: uid(),
            title: t,
            category,
            kind,
            threshold: kind === "number" ? threshold : null,
            unit: unit.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
      },

      editHabit(id, patch) {
        const next = { ...patch };
        if (next.title !== undefined) {
          next.title = next.title.trim();
          if (!next.title) delete next.title;
        }
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...next } : h)));
      },

      deleteHabit(id) {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        setHabitEntries((prev) => {
          const { [id]: _removed, ...rest } = prev;
          return rest;
        });
      },

      toggleHabitDay(habitId, day) {
        setHabitEntries((prev) => {
          const forHabit = { ...(prev[habitId] ?? {}) };
          if (forHabit[day]) delete forHabit[day];
          else forHabit[day] = true;
          return { ...prev, [habitId]: forHabit };
        });
      },

      setHabitValue(habitId, day, value) {
        setHabitEntries((prev) => {
          const forHabit = { ...(prev[habitId] ?? {}) };
          if (value === null || !Number.isFinite(value)) delete forHabit[day];
          else forHabit[day] = value;
          return { ...prev, [habitId]: forHabit };
        });
      },

      setWeight(day, kg) {
        setWeightEntries((prev) => {
          if (kg === null) {
            const { [day]: _removed, ...rest } = prev;
            return rest;
          }
          if (!isValidKg(kg)) return prev;
          return { ...prev, [day]: kg };
        });
      },

      setWeightUnit(unit) {
        setWeightSettings((prev) => ({ ...prev, unit }));
      },

      setWeightGoal(kg) {
        setWeightSettings((prev) => ({
          ...prev,
          goal: kg !== null && isValidKg(kg) ? kg : null,
        }));
      },

      addRun({ day, meters, seconds }) {
        if (!isValidDay(day) || !isValidRun(meters, seconds)) return;
        setRuns((prev) => [
          ...prev,
          { id: uid(), day, meters, seconds, createdAt: new Date().toISOString() },
        ]);
      },

      editRun(id, patch) {
        setRuns((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const next = { ...r, ...patch };
            // Reject an edit that would make the run nonsensical, rather than
            // storing something the charts would then have to defend against.
            if (!isValidDay(next.day) || !isValidRun(next.meters, next.seconds)) return r;
            return next;
          })
        );
      },

      deleteRun(id) {
        setRuns((prev) => prev.filter((r) => r.id !== id));
      },

      setRunUnit(unit) {
        setRunSettings((prev) => ({ ...prev, unit }));
      },

      setDietEntry(day, patch) {
        if (!isValidDay(day)) return;
        setDietEntries((prev) => {
          // sanitize drops out-of-range values from the patch rather than
          // storing something the stats would have to defend against.
          const next = sanitizeDietEntry({ ...(prev[day] ?? {}), ...patch });
          if (isEmptyDietEntry(next)) {
            const { [day]: _removed, ...rest } = prev;
            return rest;
          }
          return { ...prev, [day]: next };
        });
      },

      clearDietDay(day) {
        setDietEntries((prev) => {
          const { [day]: _removed, ...rest } = prev;
          return rest;
        });
      },

      setDietTargets(patch) {
        setDietSettings((prev) =>
          sanitizeDietSettings({ targets: { ...prev.targets, ...patch } })
        );
      },

      addCategory(label, color) {
        const l = label.trim();
        if (!l) return;
        setCategories((prev) => {
          const base = slugify(l);
          let id = base;
          for (let n = 2; prev.some((c) => c.id === id); n++) id = `${base}-${n}`;
          return [...prev, { id, label: l, color }];
        });
      },

      editCategory(id, patch) {
        const next = { ...patch };
        if (next.label !== undefined) {
          next.label = next.label.trim();
          if (!next.label) delete next.label;
        }
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)));
      },

      deleteCategory(id) {
        if (categories.length <= 1) return;
        const heir = categories.find((c) => c.id !== id);
        if (!heir) return;
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setTodos((prev) =>
          prev.map((t) => (t.category === id ? { ...t, category: heir.id } : t))
        );
        setHabits((prev) =>
          prev.map((h) => (h.category === id ? { ...h, category: heir.id } : h))
        );
      },

      exportData() {
        return JSON.stringify(
          {
            version: 7,
            exportedAt: new Date().toISOString(),
            todos,
            categories,
            habits,
            habitEntries,
            weightEntries,
            weightSettings,
            runs,
            runSettings,
            dietEntries,
            dietSettings,
          },
          null,
          2
        );
      },

      importData(json) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return false;
        }
        if (!isValidBackup(parsed)) return false;
        // v1–v4 backups predate deadlines; normalizeTodos fills in `due: null`.
        setTodos(normalizeTodos(parsed.todos));
        setCategories(parsed.categories);
        setHabits(parsed.habits ?? []);
        setHabitEntries(parsed.habitEntries ?? {});
        setWeightEntries(sanitizeWeightEntries(parsed.weightEntries));
        setWeightSettings(sanitizeWeightSettings(parsed.weightSettings));
        setRuns(sanitizeRuns(parsed.runs));
        setRunSettings(sanitizeRunSettings(parsed.runSettings));
        setDietEntries(sanitizeDietEntries(parsed.dietEntries));
        setDietSettings(sanitizeDietSettings(parsed.dietSettings));
        return true;
      },
    };
  }, [
    todos,
    habits,
    habitEntries,
    weightEntries,
    weightSettings,
    runs,
    runSettings,
    dietEntries,
    dietSettings,
    categories,
    todosReady,
    habitsReady,
    entriesReady,
    categoriesReady,
    weightReady,
    weightSettingsReady,
    runsReady,
    runSettingsReady,
    dietReady,
    dietSettingsReady,
    setTodos,
    setHabits,
    setHabitEntries,
    setWeightEntries,
    setWeightSettings,
    setRuns,
    setRunSettings,
    setDietEntries,
    setDietSettings,
    setCategories,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
