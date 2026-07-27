/**
 * Hidden Audio Player Service
 * Plays preview URLs in a hidden audio element
 * Syncs with game timer - no Spotify app opening
 */

let audioElement: HTMLAudioElement | null = null;

/**
 * Initialize the hidden audio player (call once)
 */
export function initAudioPlayer(): void {
  if (audioElement) return;

  audioElement = new Audio();
  audioElement.style.display = "none";
  document.body.appendChild(audioElement);
  console.log("✅ Audio player initialized");
}

/**
 * Play a preview URL (30-second MP3)
 */
export function playPreview(previewUrl: string | null): void {
  console.log("🎵 playPreview called with:", previewUrl);

  if (!previewUrl) {
    console.error("❌ No preview URL available for this song");
    return;
  }

  if (!audioElement) {
    initAudioPlayer();
  }

  if (audioElement) {
    console.log("📝 Setting audio source:", previewUrl);
    audioElement.src = previewUrl;

    console.log("▶️ Attempting to play...");
    audioElement.play().then(() => {
      console.log("✅ Audio playing successfully");
    }).catch((err) => {
      console.error("❌ Failed to play preview:", err);
    });
  }
}

/**
 * Pause the preview
 */
export function pausePreview(): void {
  if (audioElement) {
    audioElement.pause();
  }
}

/**
 * Resume the preview
 */
export function resumePreview(): void {
  if (audioElement) {
    audioElement.play().catch((err) => {
      console.error("Failed to resume preview:", err);
    });
  }
}

/**
 * Stop the preview and reset
 */
export function stopPreview(): void {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
}

/**
 * Get current playback position
 */
export function getCurrentTime(): number {
  return audioElement?.currentTime ?? 0;
}

/**
 * Get total duration
 */
export function getDuration(): number {
  return audioElement?.duration ?? 0;
}

/**
 * Check if preview is playing
 */
export function isPlaying(): boolean {
  return audioElement ? !audioElement.paused : false;
}

/**
 * Cleanup (call when leaving game)
 */
export function cleanupAudioPlayer(): void {
  if (audioElement) {
    stopPreview();
    audioElement.remove();
    audioElement = null;
  }
}
