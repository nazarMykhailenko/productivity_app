"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function readKey<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // corrupted or inaccessible storage
  }
  return undefined;
}

/**
 * Hydration-safe localStorage-backed state.
 *
 * - Renders `initial` on the server and first client paint, then loads the
 *   stored value after mount; `ready` flips true once it's in.
 * - Writes that happen before hydration first pull the stored value, so a
 *   fast interaction can never overwrite saved data with the initial state.
 * - Listens for `storage` events, so a tab left open for days picks up
 *   writes made in other tabs instead of clobbering them later.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!loadedRef.current) {
      const stored = readKey<T>(key);
      if (stored !== undefined) setValue(stored);
      loadedRef.current = true;
      setReady(true);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || e.key !== key) return;
      if (e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        // ignore malformed cross-tab payloads
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    // Mutation arriving before hydration: load the stored value first so the
    // update applies on top of saved data rather than the empty initial state.
    if (!loadedRef.current) {
      const stored = readKey<T>(keyRef.current);
      if (stored !== undefined) setValue(stored);
      loadedRef.current = true;
      setReady(true);
    }
    setValue((prev) => {
      const next =
        typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      try {
        window.localStorage.setItem(keyRef.current, JSON.stringify(next));
      } catch {
        // storage full or unavailable — state still updates in memory
      }
      return next;
    });
  }, []);

  return [value, set, ready] as const;
}
