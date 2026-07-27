/**
 * Playback configuration
 * Choose between hidden audio preview or Web Playback SDK.
 *
 * The reactive/persistent plumbing now lives in createPersistentSetting — this
 * file just declares the setting and keeps the mode-mapping helpers.
 */

import { createPersistentSetting } from "@/hooks/persistentSetting";

// Internal engine mode. "hidden-audio" = 30s MP3 preview; "sdk" = Web Playback SDK.
export type PlaybackMode = "hidden-audio" | "sdk";

// UI-facing label stored in localStorage. "preview" maps to "hidden-audio".
export type PlaybackUiMode = "preview" | "sdk";

// ============================================
// DEFAULT MODE (can be overridden via UI): "preview" | "sdk"
// ============================================
const DEFAULT_UI_MODE: PlaybackUiMode = "sdk";
// ============================================

// The reactive, persistent UI mode ("preview" | "sdk").
const playbackSetting = createPersistentSetting<PlaybackUiMode>({
  key: "playback_mode",
  defaultValue: DEFAULT_UI_MODE,
  isValid: (raw): raw is PlaybackUiMode => raw === "preview" || raw === "sdk",
  onChangeLog: (v) =>
    `🎵 Playback mode changed to: ${v === "preview" ? "⚡ Preview" : "🎵 SDK"} (applied live)`,
});

/** Read the UI-facing mode ("preview" | "sdk"). */
export const getUiMode = playbackSetting.get;
/** Change the playback mode and notify live listeners (no reload). */
export const setPlaybackMode = playbackSetting.set;
/** Reactive hook — re-renders when the mode changes. */
export const usePlaybackMode = playbackSetting.useValue;

/** Map the UI mode to the internal engine mode. */
function getCurrentMode(): PlaybackMode {
  return getUiMode() === "sdk" ? "sdk" : "hidden-audio";
}

/**
 * Get playback mode info (derived, always reads the current mode live).
 */
export function getPlaybackConfig() {
  const PLAYBACK_MODE = getCurrentMode();

  return {
    mode: PLAYBACK_MODE,
    isPreviewMode: PLAYBACK_MODE === "hidden-audio",
    isUriMode: PLAYBACK_MODE === "hidden-audio",
    isSdkMode: PLAYBACK_MODE === "sdk",
    description:
      PLAYBACK_MODE === "hidden-audio"
        ? "Hidden Audio Preview - 30s MP3 in background (no Spotify app)"
        : "Web Playback SDK - Full control in browser (requires OAuth)",
  };
}
