/**
 * Spotify Web Playback SDK integration
 * Handles authentication and playback control
 */

export interface SpotifyPlayer {
  play: (options?: any) => Promise<void>;
  pause: () => Promise<void>;
  disconnect: () => void;
  addListener: (event: string, callback: (state: any) => void) => void;
}

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

/**
 * Initialize Spotify Web SDK
 * Load the SDK script from Spotify
 */
export function initializeSpotifySDK(): Promise<void> {
  return new Promise((resolve) => {
    // If SDK already loaded, resolve immediately
    if (window.Spotify) {
      resolve();
      return;
    }

    // Set callback for when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify Web Playback SDK ready");
      resolve();
    };

    // Load Spotify SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.head.appendChild(script);
  });
}

/**
 * Create a Spotify player instance
 */
export function createSpotifyPlayer(accessToken: string): SpotifyPlayer {
  if (!window.Spotify) {
    throw new Error("Spotify SDK not loaded");
  }

  return new window.Spotify.Player({
    name: "Trackster Game Player",
    getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
    volume: 0.5,
  });
}

/**
 * Exchange authorization code for access token
 * This should be done on your backend for security
 */
export async function getAccessTokenFromBackend(code: string): Promise<string> {
  // In a real app, you'd call YOUR backend to exchange the code
  // For now, this is a placeholder
  throw new Error("Implement token exchange on your backend");
}
