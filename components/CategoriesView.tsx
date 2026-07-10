"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { PALETTE, tint } from "@/lib/categories";
import type { Category } from "@/lib/types";

export default function CategoriesView() {
  const { categories, ready, addCategory } = useStore();
  const usedColors = new Set(categories.map((c) => c.color.toLowerCase()));
  const suggested =
    PALETTE.find((p) => !usedColors.has(p.toLowerCase())) ?? PALETTE[0];

  const [label, setLabel] = useState("");
  const [color, setColor] = useState(suggested);
  const [touchedColor, setTouchedColor] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    addCategory(label, touchedColor ? color : suggested);
    setLabel("");
    setTouchedColor(false);
    setColor(suggested);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-ink-3">
          Add, rename, recolor, or remove. Deleting a category moves its tasks and
          habits to the first remaining one.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="New category name…"
          aria-label="New category name"
          className="h-10 flex-1 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3"
        />
        <div className="flex gap-2">
          <label
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-raised px-3 text-sm text-ink-2"
            title="Accent color"
          >
            <input
              type="color"
              value={touchedColor ? color : suggested}
              onChange={(e) => {
                setColor(e.target.value);
                setTouchedColor(true);
              }}
              aria-label="Accent color"
              className="size-5 cursor-pointer appearance-none border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
            Color
          </label>
          <button
            type="submit"
            disabled={!label.trim()}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add category
          </button>
        </div>
      </form>

      {!ready ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} lastOne={categories.length <= 1} />
          ))}
        </ul>
      )}

      <BackupSection />
    </div>
  );
}

function BackupSection() {
  const { exportData, importData } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  function download() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup downloaded.");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ok = importData(await file.text());
    setStatus(
      ok
        ? "Backup restored — all tasks, habits, and categories replaced."
        : "That file isn't a valid Momentum backup; nothing was changed."
    );
  }

  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Backup</h2>
      <p className="mt-1 text-sm text-ink-3">
        Everything is saved in this browser automatically and survives reloads and
        time away. Clearing the browser&apos;s site data is the one thing that erases
        it — export a backup if you want extra safety, or to move to another
        browser or device.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={download}
          className="h-9 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
        >
          Export data
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="h-9 rounded-lg border border-edge px-3 text-sm text-ink transition-colors hover:bg-raised"
        >
          Import backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="hidden"
          aria-label="Import backup file"
        />
        {status && <span className="text-xs text-ink-3">{status}</span>}
      </div>
    </section>
  );
}

function CategoryRow({ category, lastOne }: { category: Category; lastOne: boolean }) {
  const { todos, habits, categories, editCategory, deleteCategory } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.label);

  const taskCount = todos.filter((t) => t.category === category.id).length;
  const habitCount = habits.filter((h) => h.category === category.id).length;
  const heir = categories.find((c) => c.id !== category.id);

  function commit() {
    editCategory(category.id, { label: draft });
    setEditing(false);
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-edge bg-surface px-3 py-3 transition-colors hover:border-ink-3/40">
      <label className="shrink-0 cursor-pointer" title="Change color">
        <input
          type="color"
          value={category.color}
          onChange={(e) => editCategory(category.id, { color: e.target.value })}
          aria-label={`Color for ${category.label}`}
          className="size-5 cursor-pointer appearance-none border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
        />
      </label>

      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(category.label);
              setEditing(false);
            }
          }}
          autoFocus
          aria-label="Edit category name"
          className="h-8 flex-1 rounded border border-edge bg-raised px-2 text-sm text-ink outline-none focus:border-ink-3"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(category.label);
            setEditing(true);
          }}
          className="flex-1 truncate text-left text-sm text-ink hover:underline decoration-ink-3 underline-offset-4"
          title="Click to rename"
        >
          {category.label}
        </button>
      )}

      <span
        className="hidden shrink-0 rounded-full px-2 py-0.5 text-xs sm:inline"
        style={{ background: tint(category.color), color: category.color }}
      >
        {taskCount} task{taskCount === 1 ? "" : "s"} · {habitCount} habit
        {habitCount === 1 ? "" : "s"}
      </span>

      <button
        onClick={() => deleteCategory(category.id)}
        disabled={lastOne}
        aria-label={`Delete category ${category.label}`}
        title={
          lastOne
            ? "At least one category is required"
            : taskCount + habitCount > 0 && heir
              ? `Delete — items move to ${heir.label}`
              : "Delete"
        }
        className="rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.6 9h5.8l.6-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}
