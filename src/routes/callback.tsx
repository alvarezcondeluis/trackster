/**
 * OAuth Callback Page
 * Spotify redirects here after user authorizes
 * 1. Exchange auth code for access token
 * 2. Initialize Spotify Web SDK player
 * 3. Redirect back to game
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  exchangeCodeForToken,
  getAuthCodeFromUrl,
  getAuthErrorFromUrl,
  storeToken,
} from "@/services/spotifyAuth";
import { initializePlayer, loadSpotifySDK, startDeviceMonitor } from "@/services/spotifyWebSdk";
import { getPlaybackConfig } from "@/config/playback";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

const { isSdkMode } = getPlaybackConfig();

export const Route = createFileRoute("/callback")({
  component: OAuthCallback,
});

function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      // Check for error from Spotify
      const error = getAuthErrorFromUrl();
      if (error) {
        setStatus("error");
        setMessage(`Authorization denied: ${error}`);
        setTimeout(() => navigate({ to: "/" }), 3000);
        return;
      }

      // Get authorization code
      const code = getAuthCodeFromUrl();
      if (!code) {
        setStatus("error");
        setMessage("No authorization code received");
        setTimeout(() => navigate({ to: "/" }), 3000);
        return;
      }

      try {
        // Exchange code for access token
        console.log("🔄 Exchanging authorization code for token...");
        const token = await exchangeCodeForToken(code);

        // Store token
        storeToken(token);
        console.log("✅ Token stored");

        // If SDK mode, initialize player now
        if (isSdkMode) {
          try {
            console.log("🎵 Initializing Spotify player...");
            await loadSpotifySDK();
            await initializePlayer(token);
            console.log("✅ Spotify player initialized");

            // Start monitoring device health
            startDeviceMonitor();
            console.log("👁️ Device monitor started");
          } catch (playerErr) {
            console.warn("⚠️ Player initialization warning:", playerErr);
            // Don't fail the whole flow, player might be ready later
          }
        }

        setStatus("success");
        setMessage("Connected to Spotify! Redirecting...");

        // Redirect back to home after 1 second
        setTimeout(() => navigate({ to: "/" }), 1000);
      } catch (err) {
        console.error("❌ Callback error:", err);
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Failed to get access token"
        );
        setTimeout(() => navigate({ to: "/" }), 3000);
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 pb-10 pt-8">
      <div className="flex flex-col items-center gap-4 text-center">
        {status === "loading" && (
          <>
            <Loader className="h-12 w-12 text-primary animate-spin" />
            <h1 className="text-2xl font-bold">Connecting to Spotify...</h1>
            <p className="text-muted-foreground">Please wait while we complete your authorization.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-success" />
            <h1 className="text-2xl font-bold text-success">{message}</h1>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-bold text-destructive">Connection Failed</h1>
            <p className="text-destructive">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
          </>
        )}
      </div>
    </main>
  );
}
