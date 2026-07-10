# Momentum

A single-user personal productivity tracker: category-based to-dos with
deadlines, a weekly habit tracker, a daily weight check-in, and a stats page
that charts progress over time. Next.js (App Router, TypeScript), Tailwind CSS,
Recharts. All data lives in `localStorage` — no backend, no auth, no
environment variables.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Push to a Git repo and import into [Vercel](https://vercel.com/new). Vercel
detects Next.js automatically: no build settings, no environment variables, no
database. The app is marked `noindex`, since it serves one person's data over a
public URL.

## Structure

- `app/` — routes: `/` (all tasks), `/c/[slug]` (per-category), `/habits`,
  `/runs`, `/weight`, `/stats`, `/categories` (category manager + backup)
- `components/` — `Nav`, `LockGate`, `TodoView`, `HabitsView`, `RunsView`,
  `WeightView`, `StatsView`, `RunStats`, `WeightStats`, `CategoriesView`,
  `StatPrimitives`
- `lib/` — types, default categories + validated accent palette,
  `useLocalStorage` hook, store context, auth, stats / deadline / weight /
  running helpers, shared chart tokens

## Features

- **To-dos** — add, tick, edit, delete; filter by category tab. Each task takes
  an optional deadline. Open tasks sort by deadline (overdue first, undated
  last), and a completed task is never "overdue", however late it landed.
  Completions are timestamped and feed the stats.
- **Habits** — recurring activities in a Mon–Sun weekly grid. "Tick" habits get
  a per-day checkbox; "number" habits take a daily threshold and count as done
  when the logged value reaches it.
- **Weight** — one morning check-in per day, in kg or lb. Weights are always
  stored in kilograms and converted for display, so switching units never
  reinterprets past entries. The Weight tab is for logging (check-in, goal, an
  editable 14-day log); the trend lives on Stats.
- **Runs** — log a distance and a time; pace is derived. Runs are a list, not a
  per-day entry: rest days have none and a double day has two, whose totals
  combine. Distance is stored in metres and duration in seconds, so the km/mi
  toggle never reinterprets past runs. Time accepts `mm:ss`, `h:mm:ss`, or plain
  minutes.
- **Categories** — fully editable (add / rename / recolor / delete), seeded with
  Fitness, Career, Study, Personal, Misc. Deleting one moves its items to the
  first remaining category.
- **Stats** — 7-day task summary and streak; deadlines (overdue, due today,
  scheduled, plus the overdue list); tasks per day stacked by category; habits
  completed per day; per-habit consistency; running volume and pace; and weight,
  shown as daily readings under a 7-day moving average. Weight deltas come off
  that average rather than off raw readings, since day-to-day weight swings on
  water alone. On the pace chart a rest day is a gap, never a zero, and the axis
  is reversed so faster reads as higher.
- **Backup** — export/import all data as JSON from the Edit page. Backups are
  versioned (currently 6); older ones import and are normalized forward.
- **Lock screen** — a passphrase gate on every fresh page load, with an optional
  30-day "remember this device". Moving between tabs never re-prompts; the lock
  icon beside the wordmark re-locks and forgets the device. Only a salted
  SHA-256 digest ships in the bundle, never the passphrase. This is a doorstop,
  not a lock: the data it guards is readable from devtools by anyone who opens
  them, and the remembered flag is equally forgeable. It stops a passer-by.

Data is stored under the `pt:todos`, `pt:habits`, `pt:habitEntries`,
`pt:categories`, `pt:weightEntries`, `pt:weightSettings`, `pt:runs`, and
`pt:runSettings` localStorage keys. Clearing site data wipes everything —
export a backup first.
