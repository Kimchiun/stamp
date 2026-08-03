"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Sync mutex: rejects overlapping actions until the current one finishes.
 * Unlike useTransition, the lock is taken immediately on the click handler.
 */
export function useBusyLock() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (locked.current) return undefined;
    locked.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  const tryLock = useCallback(() => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    return true;
  }, []);

  const unlock = useCallback(() => {
    locked.current = false;
    setBusy(false);
  }, []);

  return { busy, run, tryLock, unlock, isLocked: () => locked.current };
}
