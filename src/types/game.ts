/**
 * Game types and interfaces
 */

export type GameState = "setup" | "playing" | "revealed" | "leaderboard";

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface Song {
  id: string;
  name: string;
  artist_name: string;
  spotify_uri: string;
  preview_url?: string;
  album_art_url?: string;  // Album cover image
  album_name?: string;
  year: number;
  genres?: string[];
  popularity?: number;
}

export interface GameContextType {
  state: GameState;
  setState: (state: GameState) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  round: number;
  setRound: (round: number) => void;
  turnIndex: number;
  setTurnIndex: (index: number) => void;
  currentPlayer: Player | null;
}
