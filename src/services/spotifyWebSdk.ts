/**
 * Spotify Web Playback SDK
 * Controls song playback directly in the browser using Spotify's SDK
 *
 * Flow:
 * 1. Load Spotify SDK script
 * 2. Initialize player with access token
 * 3. Connect to device
 * 4. Control playback (play, pause, skip, etc)
 */

let player: Spotify.Player | null = null;
let deviceId: string | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Load Spotify Web Playback SDK script
 * Must be called before anything else
 *
 * Spotify SDK looks for window.onSpotifyWebPlaybackSDKReady callback
 * when the script loads, so we need to define it first
 */
export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if SDK already loaded
    if ((window as any).Spotify) {
      console.log("✅ Spotify SDK already loaded");
      resolve();
      return;
    }

    console.log("📥 Loading Spotify Web Playback SDK...");

    // Define the callback that Spotify SDK will call when ready
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      console.log("✅ Spotify SDK ready callback fired");
      resolve();
    };

    // Create and load the SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    script.onerror = () => {
      reject(new Error("Failed to load Spotify SDK script"));
    };

    document.head.appendChild(script);
  });
}

/**
 * Initialize the Spotify player
 * Creates a new player instance and connects to Spotify
 *
 * @param accessToken - Spotify OAuth access token
 * @param playerName - Display name for this player device
 */
export async function initializePlayer(
  accessToken: string,
  playerName: string = "Trackster"
): Promise<void> {
  if (!accessToken) {
    throw new Error("Access token required to initialize player");
  }

  // Make sure SDK is loaded (will be instant if preloaded)
  if (!(window as any).Spotify) {
    console.log("⏳ SDK not yet loaded, loading now...");
    await loadSpotifySDK();
  }

  console.log("🎵 Initializing Spotify player...");

  return new Promise((resolve, reject) => {
    player = new (window as any).Spotify.Player({
      name: playerName,
      getOAuthToken: (callback: (token: string) => void) => {
        callback(accessToken);
      },
      volume: 0.5,
    });

    // Error listener
    player.addListener("initialization_error", ({ message }: any) => {
      console.error("❌ Initialization error:", message);
      reject(new Error(message));
    });

    player.addListener("authentication_error", ({ message }: any) => {
      console.error("❌ Authentication error:", message);
      reject(new Error(message));
    });

    player.addListener("account_error", ({ message }: any) => {
      console.error("❌ Account error:", message);
      reject(new Error(message));
    });

    // Ready listener - fires when device is ready
    player.addListener("ready", ({ device_id }: any) => {
      console.log("✅ Player ready. Device ID:", device_id);
      deviceId = device_id;
      resolve();
    });

    // Connection status listener - only log if state ACTUALLY changed
    let lastLoggedState: any = null;
    player.addListener("player_state_changed", (state: any) => {
      if (!state) return;

      // Only log if something meaningful changed
      const stateChanged =
        !lastLoggedState ||
        lastLoggedState.isPlaying !== !state.paused ||
        lastLoggedState.current !== state.current_track?.name;

      if (stateChanged) {
        console.log("🎵 Player state changed:", {
          isPlaying: !state.paused,
          current: state.current_track?.name,
          position: state.position,
          duration: state.duration,
        });
        lastLoggedState = {
          isPlaying: !state.paused,
          current: state.current_track?.name,
        };
      }
    });

    // Connect to Spotify
    player.connect();
  });
}

/**
 * Play a song using the Spotify URI (with retry logic for network errors)
 * @param spotifyUri - Spotify track URI (spotify:track:xxx)
 */
export async function playSong(spotifyUri: string, retries: number = 3): Promise<void> {
  if (!player) {
    throw new Error("Player not initialized. Click 'Connect Spotify' first.");
  }

  if (!deviceId) {
    throw new Error("Device not ready. Device may have disconnected.");
  }

  console.log("▶️ Playing song:", spotifyUri);
  console.log("📱 Device ID:", deviceId);
  const playStartTime = performance.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getStoredToken();

      // Call Spotify Web API to start playback
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uris: [spotifyUri],
            position_ms: 4000,
          }),
        }
      );

      // 204 No Content = success (Spotify returns 204 for successful play)
      if (response.status === 204) {
        const playLatency = performance.now() - playStartTime;
        console.log(`✅ Song playing successfully (latency: ${playLatency.toFixed(0)}ms)`);
        return;
      }

      // Handle common errors
      if (response.status === 401) {
        throw new Error("Token expired. Click 'Connect Spotify' again.");
      }

      if (response.status === 404) {
        // Device doesn't exist - try to re-initialize
        console.warn("⚠️ Device not found (404). Attempting to reinitialize...");
        throw new Error(
          "Device not found. This may happen if Spotify disconnected. Please refresh and reconnect."
        );
      }

      if (response.status === 400) {
        const errorBody = await response.json();
        console.error("❌ Bad request:", errorBody);
        throw new Error(`Bad request: ${errorBody.error?.message || response.statusText}`);
      }

      // Other errors
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("❌ API Error:", errorBody);
        throw new Error(`Failed to play song: ${response.statusText}`);
      }

      console.log("✅ Song playing");
      return;
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError && error.message.includes("Failed to fetch");

      if (isNetworkError && attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 100;
        console.warn(
          `⚠️ Network error playing (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error("❌ Error playing song:", error);
      throw error;
    }
  }
}

/**
 * Pause playback (with retry logic for network errors)
 */
export async function pausePlayback(retries: number = 3): Promise<void> {
  if (!deviceId) {
    throw new Error("Device not ready");
  }

  console.log("⏸️ Pausing playback");
  const pauseStartTime = performance.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        }
      );

      if (response.status === 204) {
        const pauseLatency = performance.now() - pauseStartTime;
        console.log(`✅ Playback paused (latency: ${pauseLatency.toFixed(0)}ms)`);
        return;
      }

      if (response.status === 401) {
        throw new Error("Token expired. Please reconnect Spotify.");
      }

      if (!response.ok) {
        throw new Error(`Pause failed: ${response.statusText}`);
      }
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError && error.message.includes("Failed to fetch");

      if (isNetworkError && attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 100;
        console.warn(
          `⚠️ Network error pausing (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error("❌ Error pausing:", error);
      throw error;
    }
  }
}

/**
 * Resume playback (with retry logic for network errors)
 */
export async function resumePlayback(retries: number = 3): Promise<void> {
  if (!deviceId) {
    throw new Error("Device not ready");
  }

  console.log("▶️ Resuming playback");
  const resumeStartTime = performance.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        }
      );

      if (response.status === 204) {
        const resumeLatency = performance.now() - resumeStartTime;
        console.log(`✅ Playback resumed (latency: ${resumeLatency.toFixed(0)}ms)`);
        return;
      }

      if (response.status === 401) {
        throw new Error("Token expired. Please reconnect Spotify.");
      }

      if (!response.ok) {
        throw new Error(`Resume failed: ${response.statusText}`);
      }
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError && error.message.includes("Failed to fetch");

      if (isNetworkError && attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 100;
        console.warn(
          `⚠️ Network error resuming (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error("❌ Error resuming:", error);
      throw error;
    }
  }
}

/**
 * Get stored access token from localStorage
 */
function getStoredToken(): string {
  const token = localStorage.getItem("spotify_access_token");
  if (!token) {
    throw new Error("No access token found");
  }
  return token;
}

/**
 * Check if player is initialized and ready
 */
export function isPlayerReady(): boolean {
  return player !== null && deviceId !== null;
}

/**
 * Health check - verify device is still connected
 */
export async function checkDeviceHealth(): Promise<{
  connected: boolean;
  deviceId: string | null;
  message: string;
}> {
  if (!deviceId) {
    return {
      connected: false,
      deviceId: null,
      message: "Device ID not set",
    };
  }

  try {
    const token = getStoredToken();
    const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        connected: false,
        deviceId,
        message: `API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const devices = data.devices || [];

    // Check if our device is in the list
    const ourDevice = devices.find((d: any) => d.id === deviceId);

    if (ourDevice) {
      // Silent on success - only log when there's an issue
      return {
        connected: true,
        deviceId,
        message: `Connected: ${ourDevice.name}`,
      };
    }

    console.warn("⚠️ Device not in active device list");
    return {
      connected: false,
      deviceId,
      message: "Device disconnected from Spotify",
    };
  } catch (error) {
    console.error("❌ Health check error:", error);
    return {
      connected: false,
      deviceId,
      message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get current device ID
 */
export function getDeviceId(): string | null {
  return deviceId;
}

/**
 * Start monitoring device health every 30 seconds
 * If device disconnects, attempt to reconnect
 */
export function startDeviceMonitor(): void {
  if (healthCheckInterval) {
    console.log("⚠️ Device monitor already running");
    return;
  }

  console.log("👁️ Starting device health monitor...");

  healthCheckInterval = setInterval(async () => {
    const health = await checkDeviceHealth();

    if (!health.connected && deviceId) {
      console.warn("⚠️ Device disconnected! Attempting to reconnect...");

      try {
        // Try to get the token and reinitialize
        const token = getStoredToken();
        await initializePlayer(token);
        console.log("✅ Device reconnected successfully");
      } catch (err) {
        console.error("❌ Failed to reconnect device:", err);
      }
    }
    // Silent on success - no need to log "still connected"
  }, 30000); // Check every 30 seconds
}

/**
 * Stop device health monitor
 */
export function stopDeviceMonitor(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log("⛔ Device monitor stopped");
  }
}

/**
 * Cleanup player
 */
export function cleanupPlayer(): void {
  stopDeviceMonitor();

  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
    console.log("🛑 Player cleaned up");
  }
}
