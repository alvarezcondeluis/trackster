/**
 * Player service — Spotify Web Playback SDK only.
 *
 * Preview mode was removed: Spotify no longer returns usable 30-second
 * preview_urls for our catalog, so full-song SDK playback is the single path.
 * This thin wrapper keeps a stable play/pause/resume/stop API so callers don't
 * depend on the SDK module directly.
 */

import { playSong, pausePlayback, resumePlayback } from "@/services/spotifyWebSdk";

let isPlaying = false;

export async function playTrack(options: {
  spotifyUri: string;
  songName?: string;
}): Promise<void> {
  const { spotifyUri, songName } = options;
  if (!spotifyUri) {
    throw new Error("❌ Missing Spotify URI");
  }
  console.log(`🎵 Playing via Spotify Web SDK: ${songName ?? spotifyUri}`);
  await playSong(spotifyUri);
  isPlaying = true;
}

export async function pauseTrack(): Promise<void> {
  await pausePlayback();
  isPlaying = false;
}

export async function resumeTrack(): Promise<void> {
  await resumePlayback();
  isPlaying = true;
}

/** The SDK can't truly "stop", so this pauses (fire-and-forget). */
export function stopTrack(): void {
  pausePlayback().catch((error) => console.error("❌ Failed to stop:", error));
  isPlaying = false;
}

export function getIsPlaying(): boolean {
  return isPlaying;
}
