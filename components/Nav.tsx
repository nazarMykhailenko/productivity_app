"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLock } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/stats";

/** Nudge color for an outstanding weigh-in. */
const DUE = "#c98500";

export default function Nav() {
  const pathname = usePathname();
  const { lock } = useLock();
  const { categories, weightEntries, dietEntries, ready } = useStore();

  // Gated on `ready` so the dots render only after hydration — the server has
  // no idea what "today" is in the reader's timezone.
  const weighInDue = ready && !(dayKey(new Date()) in weightEntries);
  const dietDue = ready && !(dayKey(new Date()) in dietEntries);

  const tabs = [
    { href: "/", label: "All" as string, accent: undefined as string | undefined },
    ...categories.map((c) => ({
      href: `/c/${encodeURIComponent(c.id)}`,
      label: c.label,
      accent: c.color,
    })),
  ];

  const rightTabs = [
    { href: "/habits", label: "Habits", due: false, dueHint: undefined as string | undefined },
    { href: "/runs", label: "Runs", due: false, dueHint: undefined },
    { href: "/weight", label: "Weight", due: weighInDue, dueHint: "Today's weigh-in is missing" },
    { href: "/diet", label: "Diet", due: dietDue, dueHint: "Today's food check-in is missing" },
    { href: "/stats", label: "Stats", due: false, dueHint: undefined },
    { href: "/categories", label: "Edit", due: false, dueHint: undefined },
  ];

  const linkClass = (active: boolean) =>
    `relative shrink-0 whitespace-nowrap rounded-t-md px-3 pb-3 pt-1.5 text-sm transition-colors ${
      active ? "text-ink" : "text-ink-2 hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-base/90 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex items-center gap-3 pt-4">
          <span className="grid size-6 place-items-center rounded-md bg-raised text-xs font-semibold text-ink">
            M
          </span>
          <span className="text-sm font-medium tracking-tight text-ink">Momentum</span>
          <button
            onClick={lock}
            aria-label="Lock and forget this device"
            title="Lock and forget this device"
            className="ml-auto rounded p-1.5 text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 7V5a4 4 0 118 0v2M3.5 7h9v6.5h-9z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <nav
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pt-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <span className="flex items-center gap-1.5">
                  {tab.accent && (
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ background: tab.accent }}
                    />
                  )}
                  {tab.label}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-1 bottom-0 h-px"
                    style={{ background: tab.accent ?? "#f4f4f5" }}
                  />
                )}
              </Link>
            );
          })}
          <span className="ml-auto flex gap-1">
            {rightTabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  title={tab.due ? tab.dueHint : undefined}
                  className={linkClass(active)}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label === "Edit" && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M11.5 2.5a1.4 1.4 0 012 2L5 13l-2.7.7L3 11l8.5-8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    )}
                    {tab.due && (
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: DUE }}
                      />
                    )}
                    {tab.label}
                    {tab.due && <span className="sr-only">(check-in due)</span>}
                  </span>
                  {active && (
                    <span aria-hidden className="absolute inset-x-1 bottom-0 h-px bg-ink" />
                  )}
                </Link>
              );
            })}
          </span>
        </nav>
      </div>
    </header>
  );
}
