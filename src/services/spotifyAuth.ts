/**
 * Spotify OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 * Secure browser-based authorization flow
 *
 * See: https://developer.spotify.com/documentation/general/guides/authorization/
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

// Get redirect URI only when needed (in browser)
function getRedirectUri(): string {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5173/callback';
  }
  // Replace localhost with 127.0.0.1 for Spotify compatibility
  return window.location.origin.replace('localhost', '127.0.0.1') + '/callback';
}

// Least privilege: only what we actually use. Web Playback SDK needs
// "streaming"; the play/pause Web API calls need modify/read playback state.
// (Dropped user-read-private / user-read-email — we never read the profile.)
const SCOPES = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
];

/**
 * Generate a PKCE code verifier — a high-entropy random string (43–128 chars).
 * Uses the Web Crypto CSPRNG (crypto.getRandomValues), NOT Math.random, because
 * the verifier is a security token and must be unpredictable.
 */
function generateCodeVerifier(length: number = 64): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => possible[b % possible.length]).join("");
}

/**
 * Generate code challenge from verifier
 * SHA256 hash of verifier, base64url encoded
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  // Base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Redirect user to Spotify authorization page
 */
export async function startSpotifyAuth(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error(
      "SPOTIFY_CLIENT_ID not set in .env - see .env.example"
    );
  }

  // Generate PKCE verifier and challenge
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier in localStorage for later exchange
  localStorage.setItem("spotify_code_verifier", verifier);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  // Redirect to Spotify
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * Called after user authorizes and gets redirected back
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error("SPOTIFY_CLIENT_ID not configured");
  }

  const verifier = localStorage.getItem("spotify_code_verifier");
  if (!verifier) {
    throw new Error("Code verifier not found - authorization may have expired");
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(),
        code_verifier: verifier,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || "Token exchange failed");
    }

    const data = await response.json();

    // Clear verifier from localStorage
    localStorage.removeItem("spotify_code_verifier");

    return data.access_token;
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}

/**
 * Get stored access token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem("spotify_access_token");
}

/**
 * Store access token in localStorage
 */
export function storeToken(token: string): void {
  localStorage.setItem("spotify_access_token", token);
}

/**
 * Clear stored token (logout)
 */
export function clearToken(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_code_verifier");
}

/**
 * Get authorization code from URL (called after redirect from Spotify)
 */
export function getAuthCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("code");
}

/**
 * Get error from authorization URL (if user denies)
 */
export function getAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("error");
}
