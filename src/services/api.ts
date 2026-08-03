/**
 * API service for backend communication
 * Calls the FastAPI backend at localhost:8000
 */

import { Song } from "@/types/game";
import { EraKey } from "@/config/era";

const API_BASE_URL = "http://localhost:8000/api";

export interface ApiError {
  message: string;
  status: number;
}

export async function fetchTotalSongs(
  difficulty: "easy" | "medium" | "hard" = "medium",
  era: EraKey = "all",
): Promise<number> {
  const response = await fetch(
    `${API_BASE_URL}/songs/count?difficulty=${difficulty}&era=${era}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch total songs");
  }

  return response.json();
}

/**
 * Fetch N random songs in one call. count=1 returns a single-element array, so
 * the game orchestrator can use this uniformly for every mode.
 *
 * fetch_preview is always false: playback is Spotify Web SDK (by track ID), so
 * the backend never needs to hunt for 30-second preview URLs.
 */
export async function fetchRandomSongs(
  offset: number,
  count: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
  era: EraKey = "all",
): Promise<Song[]> {
  const response = await fetch(
    `${API_BASE_URL}/songs/batch?offset=${offset}&count=${count}&difficulty=${difficulty}&era=${era}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch songs");
  }

  return response.json();
}

/**
 * Fetch (and cache) one song's album art on demand — lazy, when a song plays.
 * Returns the resolved art URL (null if none available).
 */
export async function fetchSongArt(
  songId: string,
): Promise<{ album_art_url: string | null; album_name: string | null }> {
  const response = await fetch(`${API_BASE_URL}/songs/${songId}/art`);
  if (!response.ok) {
    throw new Error("Failed to fetch song art");
  }
  return response.json();
}

/**
 * Rate a song by setting an absolute 0..5 score (0 = ban, never selected again).
 * Returns the persisted score. Non-blocking in the UI — failures just log.
 */
export async function rateSong(songId: string, score: number): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/songs/${songId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to rate song");
  }
  const data = await response.json();
  return data.rating_score;
}

/**
 * Health check endpoint
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
