/**
 * Spotify Preview Player
 * Plays 30-second preview URLs directly with instant playback
 * No Spotify SDK needed - just HTML audio
 */

let audioElement: HTMLAudioElement | null = null;

/**
 * Initialize preview player
 */
export function initPreviewPlayer(): void {
  if (audioElement) return;

  audioElement = new Audio();
  audioElement.volume = 0.5;
  console.log("🎵 Preview player initialized");
}

/**
 * Play a preview URL (30 second MP3)
 * Returns immediately - audio starts playing within 100ms
 */
export function playPreview(previewUrl: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!previewUrl) {
      reject(new Error("No preview URL available"));
      return;
    }

    if (!audioElement) {
      initPreviewPlayer();
    }

    if (!audioElement) {
      reject(new Error("Player not initialized"));
      return;
    }

    // Set up event listeners
    const onCanPlay = () => {
      audioElement!.removeEventListener("canplay", onCanPlay);
      audioElement!.removeEventListener("error", onError);
      console.log("▶️ Preview playing");
      resolve();
    };

    const onError = () => {
      audioElement!.removeEventListener("canplay", onCanPlay);
      audioElement!.removeEventListener("error", onError);
      reject(new Error("Failed to load preview"));
    };

    audioElement.addEventListener("canplay", onCanPlay, { once: true });
    audioElement.addEventListener("error", onError, { once: true });

    // Start loading and playing
    audioElement.src = previewUrl;
    audioElement.currentTime = 0;
    audioElement.play().catch((err) => {
      reject(new Error(`Failed to play: ${err.message}`));
    });

    console.log("📀 Loading preview...");
  });
}

/**
 * Pause preview
 */
export function pausePreview(): void {
  if (audioElement) {
    audioElement.pause();
    console.log("⏸️ Preview paused");
  }
}

/**
 * Resume preview
 */
export function resumePreview(): void {
  if (audioElement) {
    audioElement.play().catch((err) => {
      console.error("Failed to resume:", err);
    });
    console.log("▶️ Preview resumed");
  }
}

/**
 * Stop preview and reset
 */
export function stopPreview(): void {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    console.log("⏹️ Preview stopped");
  }
}

/**
 * Get current playback position (in seconds)
 */
export function getCurrentTime(): number {
  return audioElement?.currentTime ?? 0;
}

/**
 * Get preview duration (in seconds)
 * Returns 30 for most Spotify previews
 */
export function getDuration(): number {
  return audioElement?.duration ?? 30;
}

/**
 * Check if preview is playing
 */
export function isPlaying(): boolean {
  return audioElement ? !audioElement.paused : false;
}

/**
 * Cleanup player
 */
export function cleanupPreviewPlayer(): void {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = "";
    audioElement = null;
    console.log("🛑 Preview player cleaned up");
  }
}
