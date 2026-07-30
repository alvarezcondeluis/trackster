/**
 * Selected game mode — reactive, persistent (same factory as era/playback).
 * Stores only the mode id; the registry maps id → definition + component.
 */

import { createPersistentSetting } from "@/hooks/persistentSetting";
import type { GameModeId } from "@/game/modes/types";

const VALID: GameModeId[] = ["classic", "name-it", "higher-lower"];

const modeSetting = createPersistentSetting<GameModeId>({
  key: "game_mode",
  defaultValue: "classic",
  isValid: (raw): raw is GameModeId => VALID.includes(raw as GameModeId),
  onChangeLog: (v) => `🎮 Game mode: ${v} (applied live)`,
});

export const getGameMode = modeSetting.get;
export const setGameMode = modeSetting.set;
export const useGameMode = modeSetting.useValue;
