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

/**
 * Fetch N random songs in one call. count=1 returns a single-element array, so
 * the game orchestrator can use this uniformly for every mode.
 *
 * fetch_preview is always false: playback is Spotify Web SDK (by track ID), so
 * the backend never needs to hunt for 30-second preview URLs.
 */
export async function fetchRandomSongs(
  count: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
  era: EraKey = "all",
): Promise<Song[]> {
  const response = await fetch(
    `${API_BASE_URL}/songs/batch?count=${count}&difficulty=${difficulty}&fetch_preview=false&era=${era}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch songs");
  }

  return response.json();
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
