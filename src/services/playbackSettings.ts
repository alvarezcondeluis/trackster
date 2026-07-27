/**
 * Playback Settings Service
 * Information about available playback methods
 */

export type PlaybackMethod = "preview" | "sdk";

export interface PlaybackInfo {
  method: PlaybackMethod;
  name: string;
  description: string;
  speed: "instant" | "fast" | "normal";
  duration: "fixed-30s" | "full";
  requiresAuth: boolean;
  requiresDevice: boolean;
  quality: "good" | "excellent";
  icon: string;
  pros: string[];
  cons: string[];
}

/**
 * Get info about all playback methods
 */
export const PLAYBACK_METHODS: Record<PlaybackMethod, PlaybackInfo> = {
  preview: {
    method: "preview",
    name: "⚡ Preview Mode",
    description: "30-second preview clips - instant playback",
    speed: "instant",
    duration: "fixed-30s",
    requiresAuth: false,
    requiresDevice: false,
    quality: "good",
    icon: "⚡",
    pros: [
      "Instant playback (50-100ms)",
      "No Spotify connection needed",
      "Fair for all players",
      "Perfect for game fairness",
      "Works offline",
    ],
    cons: [
      "Preview only (not full song)",
      "Some songs may not have preview",
      "Lower quality than full song",
    ],
  },
  sdk: {
    method: "sdk",
    name: "🎵 Full Song (SDK)",
    description: "Complete songs via Spotify Web SDK - best quality",
    speed: "fast",
    duration: "full",
    requiresAuth: true,
    requiresDevice: true,
    quality: "excellent",
    icon: "🎵",
    pros: [
      "Full song quality",
      "Better for music lovers",
      "Spotify integration",
      "Professional audio quality",
      "Works with Spotify account",
    ],
    cons: [
      "1-2 second delay (Spotify buffering)",
      "Requires Spotify login",
      "Need device registration",
      "Subject to rate limiting",
    ],
  },
};

/**
 * Get information about the current playback method
 */
export function getPlaybackMethodInfo(method: PlaybackMethod = "preview"): PlaybackInfo {
  return PLAYBACK_METHODS[method];
}

/**
 * Compare two playback methods
 */
export function comparePlaybackMethods(): {
  fastest: PlaybackMethod;
  bestQuality: PlaybackMethod;
  mostFair: PlaybackMethod;
  recommended: PlaybackMethod;
} {
  return {
    fastest: "preview",        // 50-100ms vs 1-2 seconds
    bestQuality: "sdk",        // Full song vs preview
    mostFair: "preview",       // Everyone gets exact 30s
    recommended: "preview",    // For games, fairness matters more
  };
}

/**
 * Get recommendation based on use case
 */
export function getRecommendation(useCase: "game" | "discovery" | "dj"): PlaybackMethod {
  switch (useCase) {
    case "game":
      return "preview"; // Fair, fast, no setup needed
    case "discovery":
      return "sdk"; // Full songs to discover better
    case "dj":
      return "sdk"; // Full control and quality
    default:
      return "preview";
  }
}
