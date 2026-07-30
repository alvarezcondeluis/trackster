/**
 * Game mode contract (Strategy pattern).
 *
 * A mode is described by data (id/label/icon/how many songs a round needs) plus
 * a Round component. The Game orchestrator stays mode-agnostic: it fetches the
 * songs, renders `mode.Round`, and applies whatever result the round reports.
 * Adding a mode = implement a Round + register it. Game.tsx never changes.
 */

import type { ComponentType } from "react";
import type { Player, Song } from "@/types/game";

export type GameModeId = "classic" | "name-it" | "higher-lower";

export interface RoundResult {
  correct: boolean;
  points: number;
}

export interface RoundProps {
  /** Songs for this round: 1 for classic/name-it, 2 for higher-lower. */
  songs: Song[];
  player: Player;
  round: number;
  /** The round reports its outcome; the orchestrator scores + advances. */
  onResult: (result: RoundResult) => void;
}

export interface GameModeDef {
  id: GameModeId;
  label: string;
  icon: string;
  description: string;
  /** How many songs to fetch per round — drives the orchestrator's fetch. */
  songsPerRound: number;
  /**
   * Whether the mode plays audio. Modes that only compare metadata (e.g. Higher
   * or Lower, which just compares popularity) set this to false: the orchestrator
   * then skips Spotify entirely — no connection required, no preview lookup — and
   * the Lobby hides the Spotify/playback controls.
   */
  needsAudio: boolean;
  /** Minimum players required to start (1 = solo-playable). */
  minPlayers: number;
  /** Tailwind gradient classes for the mode-select card accent. */
  accent: string;
  Round: ComponentType<RoundProps>;
}
