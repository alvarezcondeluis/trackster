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
 * Fetch a random song from the backend
 * Always fetches preview URLs for hidden audio playback
 */
export async function fetchRandomSong(
  difficulty: "easy" | "medium" | "hard" = "medium",
  era: EraKey = "all",
  fetchPreview: boolean = true,
): Promise<Song> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/songs/random?difficulty=${difficulty}&fetch_preview=${fetchPreview}&era=${era}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch song");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching song:", error);
    throw error;
  }
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
