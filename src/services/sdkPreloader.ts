/**
 * SDK Preloader Service
 * Manages Spotify SDK preloading to optimize initialization time
 * Saves 2-5 seconds by loading SDK on app start instead of on login
 */

import { loadSpotifySDK } from "./spotifyWebSdk";

interface PreloadState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
}

let preloadState: PreloadState = {
  isLoading: false,
  isLoaded: false,
  error: null,
};

let preloadPromise: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Subscribe to preload state changes
 */
export function subscribeToPreload(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Start preloading Spotify SDK in background
 * Safe to call multiple times - only loads once
 */
export function startPreload(): Promise<void> {
  // Already loaded or loading
  if (preloadState.isLoaded) {
    return Promise.resolve();
  }

  // Already loading - return same promise
  if (preloadPromise) {
    return preloadPromise;
  }

  // Start preload
  preloadState.isLoading = true;
  notifyListeners();

  preloadPromise = loadSpotifySDK()
    .then(() => {
      preloadState.isLoading = false;
      preloadState.isLoaded = true;
      preloadState.error = null;
      console.log("✅ SDK preloaded successfully");
    })
    .catch((error) => {
      preloadState.isLoading = false;
      preloadState.error = error;
      console.warn("⚠️ SDK preload failed:", error);
    })
    .finally(() => {
      notifyListeners();
    });

  return preloadPromise;
}

/**
 * Get current preload state
 */
export function getPreloadState(): PreloadState {
  return { ...preloadState };
}

/**
 * Check if SDK is ready to use (preloaded)
 */
export function isSdkReady(): boolean {
  return preloadState.isLoaded;
}

/**
 * Wait for SDK to be ready
 */
export async function waitForSdk(): Promise<void> {
  if (preloadState.isLoaded) {
    return;
  }

  if (preloadState.error) {
    throw preloadState.error;
  }

  // SDK is loading, wait for it
  if (preloadPromise) {
    return preloadPromise;
  }

  // Not started yet, start it
  return startPreload();
}

/**
 * Reset preload state (for testing/logout)
 */
export function resetPreload(): void {
  preloadState = {
    isLoading: false,
    isLoaded: false,
    error: null,
  };
  preloadPromise = null;
  notifyListeners();
}
