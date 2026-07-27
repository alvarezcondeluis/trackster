/**
 * Unified Player Service
 * Supports both preview URLs and Spotify Web SDK
 * Automatically chooses the best method based on what's available
 */

import { getPlaybackConfig } from "@/config/playback";
import { playSong, pausePlayback, resumePlayback } from "@/services/spotifyWebSdk";
import { playPreview, pausePreview, resumePreview, stopPreview } from "@/services/spotifyPreviewPlayer";

export type PlaybackMethod = "preview" | "sdk";

interface PlaybackState {
  method: PlaybackMethod;
  isPlaying: boolean;
  duration: number;
}

let currentMethod: PlaybackMethod = "preview";
let playbackState: PlaybackState = {
  method: "preview",
  isPlaying: false,
  duration: 30,
};

/**
 * Determine which playback method to use
 * CLEAN PIPELINES: Strictly follow config, no mixing
 */
function determinePlaybackMethod(previewUrl?: string): PlaybackMethod {
  const { isSdkMode, isPreviewMode } = getPlaybackConfig();

  // Explicit config takes priority - NO MIXING
  if (isSdkMode) {
    return "sdk";
  }

  if (isPreviewMode) {
    return "preview";
  }

  // Fallback (shouldn't reach here with valid config)
  return "preview";
}

/**
 * Play a song using configured pipeline (CLEAN SEPARATION)
 */
export async function playTrack(options: {
  spotifyUri: string;
  previewUrl?: string;
  songName: string;
}): Promise<PlaybackMethod> {
  const { spotifyUri, previewUrl, songName } = options;
  const { isSdkMode, isPreviewMode } = getPlaybackConfig();

  // Determine which method to use (based on CONFIGURATION, not data availability)
  let method = determinePlaybackMethod(previewUrl);
  currentMethod = method;

  console.log(`🎵 Playing via ${method === "preview" ? "⚡ Preview" : "🎵 SDK"}: ${songName}`);

  try {
    // PREVIEW PIPELINE
    if (isPreviewMode) {
      if (!previewUrl) {
        throw new Error("❌ Preview mode: song has no preview URL available");
      }
      console.log("⚡ Preview Pipeline: Using 30s preview (instant)");
      await playPreview(previewUrl);
      playbackState = {
        method: "preview",
        isPlaying: true,
        duration: 30,
      };
      return "preview";
    }

    // SDK PIPELINE
    if (isSdkMode) {
      if (!spotifyUri) {
        throw new Error("❌ SDK mode enabled but missing Spotify URI");
      }
      console.log("🎵 SDK Pipeline: Using full song via Spotify Web SDK");
      await playSong(spotifyUri);
      playbackState = {
        method: "sdk",
        isPlaying: true,
        duration: 30,
      };
      return "sdk";
    }

    throw new Error("❌ Invalid playback configuration");
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} pipeline failed:`, error);
    throw error;
  }
}

/**
 * Pause playback (works for both methods)
 */
export async function pauseTrack(): Promise<void> {
  try {
    if (currentMethod === "preview") {
      pausePreview();
    } else {
      await pausePlayback();
    }
    playbackState.isPlaying = false;
  } catch (error) {
    console.error("❌ Failed to pause:", error);
    throw error;
  }
}

/**
 * Resume playback (works for both methods)
 */
export async function resumeTrack(): Promise<void> {
  try {
    if (currentMethod === "preview") {
      resumePreview();
    } else {
      await resumePlayback();
    }
    playbackState.isPlaying = true;
  } catch (error) {
    console.error("❌ Failed to resume:", error);
    throw error;
  }
}

/**
 * Stop playback (works for both methods)
 */
export function stopTrack(): void {
  try {
    if (currentMethod === "preview") {
      stopPreview();
    } else {
      // Can't truly "stop" SDK, just pause
      pausePlayback();
    }
    playbackState.isPlaying = false;
  } catch (error) {
    console.error("❌ Failed to stop:", error);
  }
}

/**
 * Get current playback method
 */
export function getPlaybackMethod(): PlaybackMethod {
  return currentMethod;
}

/**
 * Get playback state
 */
export function getPlaybackState(): PlaybackState {
  return playbackState;
}

/**
 * Check if preview is available
 */
export function hasPreviewAvailable(previewUrl?: string): boolean {
  return !!previewUrl;
}

/**
 * Get info about which method will be used
 */
export function getPlaybackInfo(previewUrl?: string) {
  const method = determinePlaybackMethod(previewUrl);
  return {
    method,
    hasPreview: !!previewUrl,
    willUsePreview: method === "preview",
    speedInfo:
      method === "preview"
        ? "⚡ Instant playback (preview)"
        : "⏱️ ~1-2 second delay (full song via SDK)",
  };
}
