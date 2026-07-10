"use client";

import { useState, type ReactNode } from "react";
import { REMEMBER_DAYS, useLock, type UnlockResult } from "@/lib/auth";

const ERROR: Record<Exclude<UnlockResult, "ok">, string> = {
  wrong: "That's not the password.",
  "insecure-context": "Unlocking needs https or localhost.",
};

export default function LockGate({ children }: { children: ReactNode }) {
  const { unlocked, checked } = useLock();

  // Until the remembered flag is read, show neither app nor lock screen —
  // otherwise a remembered device flashes the password prompt on every load.
  if (!checked) return <div className="min-h-screen" aria-hidden />;
  if (!unlocked) return <LockScreen />;
  return <>{children}</>;
}

function LockScreen() {
  const { unlock } = useLock();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<Exclude<UnlockResult, "ok"> | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    const result = await unlock(password, remember);
    if (result === "ok") return; // unmounts; no need to reset state
    setError(result);
    setPassword("");
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-xs">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-raised text-sm font-semibold text-ink">
            M
          </span>
          <span className="text-sm font-medium tracking-tight text-ink">Momentum</span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Password"
              aria-invalid={error !== null}
              aria-describedby={error ? "password-error" : undefined}
              className={`h-11 w-full rounded-lg border bg-raised px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors ${
                error ? "border-[#e66767]" : "border-edge focus:border-ink-3"
              }`}
            />
            {/* Height is reserved so the button doesn't jump when an error appears. */}
            <p
              id="password-error"
              role="alert"
              className="mt-2 h-4 text-xs text-[#e66767]"
            >
              {error ? ERROR[error] : ""}
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-[#3987e5]"
            />
            Remember this device
          </label>

          <button
            type="submit"
            disabled={busy || !password}
            className="h-11 w-full rounded-lg bg-ink text-sm font-medium text-[#0d0d0f] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-ink-3">
          Remembering skips this screen for {REMEMBER_DAYS} days. Your data never
          leaves this browser — this only keeps someone from reading it over your
          shoulder.
        </p>
      </div>
    </main>
  );
}
