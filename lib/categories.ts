import type { Category } from "./types";

// Validated dark-surface palette, in fixed CVD-safe order. New categories
// are suggested the first unused slot; users may still pick any color.
export const PALETTE = [
  "#3987e5", // blue
  "#199e70", // aqua
  "#c98500", // yellow
  "#9085e9", // violet
  "#e66767", // red
  "#d55181", // magenta
  "#d95926", // orange
  "#5598e7", // light blue
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "fitness", label: "Fitness", color: PALETTE[0] },
  { id: "career", label: "Career", color: PALETTE[1] },
  { id: "study", label: "Study", color: PALETTE[2] },
  { id: "personal", label: "Personal", color: PALETTE[3] },
  { id: "misc", label: "Misc", color: PALETTE[4] },
];

/** Neutral color for items whose category no longer exists. */
export const FALLBACK_CATEGORY: Category = {
  id: "__unknown__",
  label: "Uncategorized",
  color: "#898781",
};

/** Translucent tint of an accent color, for badge backgrounds. */
export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return `rgba(137,135,129,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "category"
  );
}
