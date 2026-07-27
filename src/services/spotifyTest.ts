/**
 * Spotify token testing utility
 * Verifies that the access token is valid before playing songs
 */

import { getStoredToken } from "./spotifyAuth";

/**
 * Test a Spotify access token by checking /me endpoint
 */
export async function testSpotifyToken(token?: string): Promise<{
  valid: boolean;
  user?: {
    id: string;
    display_name: string;
    email: string;
  };
  message: string;
}> {
  const accessToken = token || getStoredToken();

  if (!accessToken) {
    return {
      valid: false,
      message: "No access token found",
    };
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const user = await response.json();
      return {
        valid: true,
        user: {
          id: user.id,
          display_name: user.display_name,
          email: user.email,
        },
        message: `Logged in as ${user.display_name}`,
      };
    } else if (response.status === 401) {
      return {
        valid: false,
        message: "Token is invalid or expired",
      };
    } else {
      return {
        valid: false,
        message: `Spotify API error: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test both backend and Spotify connectivity
 */
export async function testFullConnection(): Promise<{
  backend: boolean;
  spotify: boolean;
  messages: {
    backend: string;
    spotify: string;
  };
}> {
  let backendOk = false;
  let spotifyOk = false;
  let backendMsg = "Testing backend...";
  let spotifyMsg = "Testing Spotify...";

  try {
    // Test backend
    const backendRes = await fetch("http://localhost:8000/api/health");
    backendOk = backendRes.ok;
    backendMsg = backendOk
      ? "✅ Backend is running"
      : "❌ Backend returned error";
  } catch {
    backendMsg = "❌ Cannot reach backend (is FastAPI running?)";
  }

  try {
    // Test Spotify
    const spotifyRes = await testSpotifyToken();
    spotifyOk = spotifyRes.valid;
    spotifyMsg = spotifyRes.message;
  } catch {
    spotifyMsg = "❌ Cannot reach Spotify API";
  }

  return {
    backend: backendOk,
    spotify: spotifyOk,
    messages: {
      backend: backendMsg,
      spotify: spotifyMsg,
    },
  };
}
