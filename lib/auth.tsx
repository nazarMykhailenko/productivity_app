"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * SHA-256 of SALT + the passphrase. Keeping only the digest keeps the passphrase
 * out of the JS bundle and out of git history; the salt stops the digest from
 * being looked up in a rainbow table.
 *
 * This is a doorstop, not a lock. Everything it guards already sits in this
 * browser's localStorage, readable from devtools by anyone who opens them, and
 * the "remembered" flag below is equally forgeable. It keeps a passer-by out of
 * an unattended screen. It does not withstand anyone who wants in.
 */
const SALT = "momentum:v1:";
const PASSWORD_HASH = "64dfd92d7ce2000be4c84321c83a145f791e7cf2275e9e1e7a4dd6b0f45e59b5";

const REMEMBER_KEY = "pt:unlockUntil";
const REMEMBER_DAYS = 30;

export type UnlockResult = "ok" | "wrong" | "insecure-context";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Lock {
  unlocked: boolean;
  /** False until the remembered flag has been read; render nothing before then. */
  checked: boolean;
  unlock: (password: string, remember: boolean) => Promise<UnlockResult>;
  /** Re-locks and forgets this device. */
  lock: () => void;
}

const LockContext = createContext<Lock | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  // Held in memory, so client-side navigation between tabs keeps the app open
  // and only a full page load asks again.
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const until = Number(window.localStorage.getItem(REMEMBER_KEY));
      if (Number.isFinite(until) && until > Date.now()) setUnlocked(true);
    } catch {
      // storage unavailable — fall through to the lock screen
    }
    setChecked(true);
  }, []);

  const unlock = useCallback(async (password: string, remember: boolean) => {
    // crypto.subtle exists only in a secure context: https, or localhost. A dev
    // server reached over a LAN IP has none, and hashing would throw.
    if (!globalThis.crypto?.subtle) return "insecure-context" as const;

    const hash = await sha256Hex(SALT + password);
    if (hash !== PASSWORD_HASH) return "wrong" as const;

    if (remember) {
      try {
        const until = Date.now() + REMEMBER_DAYS * 86_400_000;
        window.localStorage.setItem(REMEMBER_KEY, String(until));
      } catch {
        // couldn't persist; the session still unlocks
      }
    }
    setUnlocked(true);
    return "ok" as const;
  }, []);

  const lock = useCallback(() => {
    try {
      window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // nothing to forget
    }
    setUnlocked(false);
  }, []);

  const value = useMemo<Lock>(
    () => ({ unlocked, checked, unlock, lock }),
    [unlocked, checked, unlock, lock]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): Lock {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used inside <LockProvider>");
  return ctx;
}

export { REMEMBER_DAYS };
