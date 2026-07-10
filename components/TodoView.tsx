"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { tint } from "@/lib/categories";
import { dayKey } from "@/lib/stats";
import {
  byDue,
  completedLate,
  dueSpoken,
  dueState,
  dueText,
  formatDueDate,
  isOverdue,
  type DueState,
} from "@/lib/deadlines";
import type { Todo } from "@/lib/types";

/** Urgency colors for a deadline badge. */
const DUE_TONE: Record<DueState, string> = {
  overdue: "#e66767",
  today: "#c98500",
  tomorrow: "#a6a6ad",
  future: "#6e6e76",
};

export default function TodoView({ category }: { category?: string }) {
  const { todos, ready, addTodo, categories, categoryMap } = useStore();
  const [title, setTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [due, setDue] = useState("");

  const visible = useMemo(
    () => (category ? todos.filter((t) => t.category === category) : todos),
    [todos, category]
  );
  // Deadline order: what's late, then what's next, then everything undated.
  const open = visible.filter((t) => !t.done).sort(byDue);
  const done = visible
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  // Only after hydration: the server has no idea what "today" is where you are.
  const todayKey = ready ? dayKey(new Date()) : "";
  const overdueCount = ready ? open.filter((t) => isOverdue(t, todayKey)).length : 0;

  if (category && ready && !categoryMap[category]) {
    return (
      <div className="rounded-xl border border-edge bg-surface px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink">This category no longer exists</p>
        <p className="mt-1 text-sm text-ink-3">
          It may have been renamed or deleted.{" "}
          <Link href="/" className="text-ink underline underline-offset-4">
            Back to all tasks
          </Link>
        </p>
      </div>
    );
  }

  const heading = category ? (categoryMap[category]?.label ?? "…") : "All tasks";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cat = category ?? newCategory ?? categories[0]?.id;
    if (!cat) return;
    addTodo(title, cat, due || null);
    setTitle("");
    setDue("");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        {ready && (
          <p className="text-sm text-ink-3">
            {open.length} open · {done.length} done
            {overdueCount > 0 && (
              <>
                {" · "}
                <span style={{ color: DUE_TONE.overdue }}>{overdueCount} overdue</span>
              </>
            )}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={category ? `Add a ${heading} task…` : "Add a task…"}
          aria-label="Task title"
          className="h-10 flex-1 rounded-lg border border-edge bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink-3"
        />
        <div className="flex flex-wrap gap-2">
          <input
            value={due}
            onChange={(e) => setDue(e.target.value)}
            type="date"
            aria-label="Deadline (optional)"
            title="Deadline (optional)"
            className="h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink outline-none transition-colors focus:border-ink-3"
          />
          {!category && (
            <select
              value={newCategory || categories[0]?.id || ""}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Category"
              className="h-10 rounded-lg border border-edge bg-raised px-3 text-sm text-ink outline-none focus:border-ink-3"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={!title.trim()}
            className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>

      {!ready ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState heading={category ? heading : undefined} />
      ) : (
        <div className="space-y-8">
          <ul className="space-y-2">
            {open.map((t) => (
              <TodoRow key={t.id} todo={t} showCategory={!category} />
            ))}
            {open.length === 0 && (
              <li className="rounded-lg border border-dashed border-edge px-4 py-6 text-center text-sm text-ink-3">
                Nothing open — nice.
              </li>
            )}
          </ul>
          {done.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">
                Completed
              </h2>
              <ul className="space-y-2">
                {done.map((t) => (
                  <TodoRow key={t.id} todo={t} showCategory={!category} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ heading }: { heading?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface px-6 py-16 text-center">
      <p className="text-sm font-medium text-ink">
        {heading ? `No ${heading} tasks yet` : "No tasks yet"}
      </p>
      <p className="mt-1 text-sm text-ink-3">
        Add your first one above — completions feed the Stats page.
      </p>
    </div>
  );
}

function TodoRow({ todo, showCategory }: { todo: Todo; showCategory: boolean }) {
  const { toggleTodo, deleteTodo, editTodo, getCategory } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const cat = getCategory(todo.category);

  function commit() {
    editTodo(todo.id, draft);
    setEditing(false);
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-edge bg-surface px-3 py-2.5 transition-colors hover:border-ink-3/40">
      <button
        onClick={() => toggleTodo(todo.id)}
        aria-label={todo.done ? `Mark “${todo.title}” not done` : `Mark “${todo.title}” done`}
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
          todo.done ? "border-transparent" : "border-ink-3 hover:border-ink"
        }`}
        style={todo.done ? { background: cat.color } : undefined}
      >
        {todo.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M2 5.5L4 7.5L8 3" stroke="#0d0d0f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
          autoFocus
          aria-label="Edit task title"
          className="h-7 flex-1 rounded border border-edge bg-raised px-2 text-sm text-ink outline-none focus:border-ink-3"
        />
      ) : (
        <span
          className={`flex-1 truncate text-sm ${
            todo.done ? "text-ink-3 line-through" : "text-ink"
          }`}
        >
          {todo.title}
        </span>
      )}

      <DueBadge todo={todo} />

      {showCategory && (
        <span
          className="hidden shrink-0 rounded-full px-2 py-0.5 text-xs sm:inline"
          style={{ background: tint(cat.color), color: cat.color }}
        >
          {cat.label}
        </span>
      )}

      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {!editing && (
          <button
            onClick={() => {
              setDraft(todo.title);
              setEditing(true);
            }}
            aria-label={`Edit “${todo.title}”`}
            className="rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M11.5 2.5a1.4 1.4 0 012 2L5 13l-2.7.7L3 11l8.5-8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => deleteTodo(todo.id)}
          aria-label={`Delete “${todo.title}”`}
          className="rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-[#e66767]"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.6 9h5.8l.6-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function DueBadge({ todo }: { todo: Todo }) {
  const { setTodoDue } = useStore();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        value={todo.due ?? ""}
        onChange={(e) => setTodoDue(todo.id, e.target.value || null)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
        autoFocus
        type="date"
        aria-label={`Deadline for “${todo.title}”`}
        className="h-7 shrink-0 rounded border border-edge bg-raised px-2 text-xs text-ink outline-none focus:border-ink-3"
      />
    );
  }

  if (todo.due == null) {
    return (
      <button
        onClick={() => setEditing(true)}
        aria-label={`Set a deadline for “${todo.title}”`}
        title="Set a deadline"
        className="shrink-0 rounded p-1.5 text-ink-3 opacity-100 transition-opacity hover:bg-raised hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2.5 4.5h11v9h-11zM5 2.5v3M11 2.5v3M2.5 7.5h11"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    );
  }

  // A finished task carries no urgency — a deadline that has passed is just
  // history once the work is done, so show the plain date and note if it slipped.
  if (todo.done) {
    const late = completedLate(todo);
    return (
      <button
        onClick={() => setEditing(true)}
        aria-label={`“${todo.title}” was due ${formatDueDate(todo.due)}${
          late ? ", completed late" : ""
        }. Click to change the deadline.`}
        title={late ? "Completed after the deadline" : "Change the deadline"}
        className="shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums text-ink-3 transition-colors hover:bg-raised"
      >
        {formatDueDate(todo.due)}
        {late && <span className="ml-1 text-ink-3/70">late</span>}
      </button>
    );
  }

  const state = dueState(todo.due);
  const tone = DUE_TONE[state];
  const emphasized = state === "overdue" || state === "today";

  return (
    <button
      onClick={() => setEditing(true)}
      aria-label={`“${todo.title}” ${dueSpoken(todo.due)}. Click to change the deadline.`}
      title="Change the deadline"
      className="shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums transition-colors hover:bg-raised"
      style={{ color: tone, background: emphasized ? tint(tone) : undefined }}
    >
      {dueText(todo.due)}
    </button>
  );
}
