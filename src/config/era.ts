/**
 * Era (time-period) filter configuration
 * Chooses which years of music are eligible in the game.
 *
 * The reactive/persistent plumbing lives in createPersistentSetting. The KEY is
 * the contract with the backend — the backend owns what each key means in
 * actual years (see ERA_RANGES in song_service.py). Here we only need the key
 * + a human label for the dropdown.
 */

import { createPersistentSetting } from "@/hooks/persistentSetting";

export type EraKey =
  | "all"
  | "last5"
  | "2020s"
  | "2010s"
  | "2000s"
  | "2000plus"
  | "90s"
  | "80s"
  | "70s";

export interface EraOption {
  key: EraKey;
  label: string;
}

// Order here = order shown in the dropdown.
export const ERAS: EraOption[] = [
  { key: "all", label: "All Time" },
  { key: "last5", label: "Last 5 Years" },
  { key: "2020s", label: "2020s" },
  { key: "2010s", label: "2010s" },
  { key: "2000s", label: "2000s" },
  { key: "2000plus", label: "2000 – Now" },
  { key: "90s", label: "90s" },
  { key: "80s", label: "80s" },
  { key: "70s", label: "70s" },
];

// The reactive, persistent era key.
const eraSetting = createPersistentSetting<EraKey>({
  key: "era",
  defaultValue: "all",
  isValid: (raw): raw is EraKey => ERAS.some((e) => e.key === raw),
  onChangeLog: (v) => `📅 Era changed to: ${v} (applied live)`,
});

/** Read the current era key. */
export const getEra = eraSetting.get;
/** Change the era and notify live listeners (no reload). */
export const setEra = eraSetting.set;
/** Reactive hook — re-renders when the era changes. */
export const useEra = eraSetting.useValue;
