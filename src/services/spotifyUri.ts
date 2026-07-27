/**
 * Spotify URI Scheme Handler
 * Opens songs directly in Spotify app using spotify:track: URIs
 * No OAuth, Web SDK, or API calls needed
 */

import { Song } from "@/types/game";

/**
 * Play a song using Spotify URI scheme
 * Opens Spotify app and plays the track
 *
 * @param trackId - Spotify track ID (not full URI)
 */
export function playUsingUri(trackId: string): void {
  if (!trackId) {
    throw new Error("Track ID is required");
  }

  const spotifyUri = `spotify:track:${trackId}`;
  console.log(`Playing via URI: ${spotifyUri}`);

  // Navigate to Spotify URI
  // On desktop with Spotify app: opens Spotify and plays the track
  // On mobile with Spotify app: opens Spotify and plays the track
  // Without app: might show error or web player
  window.location.href = spotifyUri;
}

/**
 * Play a song from Song object using URI scheme
 */
export function playFromSongUri(song: Song): void {
  if (!song?.id) {
    throw new Error("Song must have an ID");
  }
  playUsingUri(song.id);
}

/**
 * Create a Spotify URI string
 */
export function createSpotifyUri(trackId: string): string {
  return `spotify:track:${trackId}`;
}

/**
 * Check if Spotify app is likely available
 * (This is a best-guess heuristic - true detection requires checking if URI was handled)
 */
export function isSpotifyAppLikelyAvailable(): boolean {
  // On desktop: usually available
  // On mobile: depends on device
  // This is not a perfect check - we just assume it's available and let the user handle errors
  if (typeof window === "undefined") return false;

  // Could check user agent for better detection
  const userAgent = navigator.userAgent.toLowerCase();
  const isDesktop = !/mobile|android|iphone|ipad/.test(userAgent);

  return isDesktop; // Better on desktop
}

/**
 * Alternative: Open in Spotify Web Player as fallback
 */
export function openInSpotifyWebPlayer(trackId: string): void {
  const webUrl = `https://open.spotify.com/track/${trackId}`;
  window.open(webUrl, "_blank");
}

/**
 * Play with fallback to web player if URI doesn't work
 * (Note: We can't reliably detect if URI was handled, so use with caution)
 */
export function playWithFallback(trackId: string, delayMs: number = 1500): void {
  playUsingUri(trackId);

  // After a delay, if user is still on the page, they might not have Spotify app
  // Show them an option to open web player
  setTimeout(() => {
    console.warn(
      "Spotify app may not have opened. User could open in web player as fallback."
    );
    // App can show a fallback button if needed
  }, delayMs);
}
