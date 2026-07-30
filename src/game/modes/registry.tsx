/**
 * Game mode registry — the single place that knows every mode.
 * Add a mode here (+ its Round component) and it automatically appears in the
 * mode-select screen and is playable. The orchestrator reads from this map.
 */

import type { GameModeDef, GameModeId } from "./types";
import { ClassicRound } from "./ClassicRound";
import { NameItRound } from "./NameItRound";
import { HigherLowerRound } from "./HigherLowerRound";

export const GAME_MODES: Record<GameModeId, GameModeDef> = {
  classic: {
    id: "classic",
    label: "Guess & Reveal",
    icon: "🎧",
    description: "Listen to a track, then reveal it and score yourself.",
    songsPerRound: 1,
    needsAudio: true,
    minPlayers: 2,
    accent: "from-primary/40 to-cyan/25",
    Round: ClassicRound,
  },
  "name-it": {
    id: "name-it",
    label: "Name It",
    icon: "⌨️",
    description: "Type the song title before the clock runs out.",
    songsPerRound: 1,
    needsAudio: true,
    minPlayers: 1,
    accent: "from-neon/40 to-primary/25",
    Round: NameItRound,
  },
  "higher-lower": {
    id: "higher-lower",
    label: "Higher or Lower",
    icon: "📈",
    description: "Pick the more popular of two songs.",
    songsPerRound: 2,
    needsAudio: false,
    minPlayers: 1,
    accent: "from-cyan/40 to-neon/25",
    Round: HigherLowerRound,
  },
};

export const GAME_MODE_LIST: GameModeDef[] = Object.values(GAME_MODES);
