/**
 * Generic persistent, reactive setting.
 *
 * One factory that replaces the near-identical plumbing behind playback mode,
 * era, and any future setting (volume, difficulty, ...). A setting is fully
 * described by three things:
 *   - a localStorage key   (persistence — survives reload, readable by non-React code)
 *   - a default value      (used when nothing valid is stored)
 *   - a validator          (guards against stale/garbage stored values)
 *
 * The factory returns:
 *   - get():      read the current value (localStorage → validated → default)
 *   - set():      persist + broadcast a window event (applies live, no reload)
 *   - useValue(): a React hook that re-renders on change (this tab AND other tabs)
 *
 * The reactivity trick (same as before): a plain localStorage write notifies
 * no one, so `set` also fires a window event, and `useValue` listens and copies
 * the value into React state — turning a silent write into a live re-render.
 */

import { useEffect, useState } from "react";

export interface PersistentSetting<T extends string> {
  get: () => T;
  set: (value: T) => void;
  useValue: () => T;
}

export function createPersistentSetting<T extends string>(config: {
  key: string;
  defaultValue: T;
  isValid: (raw: string | null) => raw is T;
  /** Optional: message to console.log when the value changes. */
  onChangeLog?: (value: T) => string;
}): PersistentSetting<T> {
  const { key, defaultValue, isValid, onChangeLog } = config;

  // Per-setting event name, derived from the key so two settings never collide.
  const EVENT = `trackster:setting:${key}`;

  const get = (): T => {
    if (typeof window === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    return isValid(raw) ? raw : defaultValue;
  };

  const set = (value: T): void => {
    localStorage.setItem(key, value); // persist
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value })); // announce
    if (onChangeLog) console.log(onChangeLog(value));
  };

  const useValue = (): T => {
    const [value, setValue] = useState<T>(get);

    useEffect(() => {
      const sync = () => setValue(get());
      window.addEventListener(EVENT, sync); // same-tab change (from set)
      window.addEventListener("storage", sync); // other-tab change
      return () => {
        window.removeEventListener(EVENT, sync);
        window.removeEventListener("storage", sync);
      };
    }, []);

    return value;
  };

  return { get, set, useValue };
}
