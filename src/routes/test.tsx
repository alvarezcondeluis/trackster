/**
 * Test Page
 * Verify backend and Spotify connections before playing
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { testFullConnection, testSpotifyToken } from "@/services/spotifyTest";
import { getPlaybackConfig } from "@/config/playback";

const { isUriMode } = getPlaybackConfig();

export const Route = createFileRoute("/test")({
  component: TestPage,
});

function TestPage() {
  const [backendOk, setBackendOk] = useState(false);
  const [spotifyOk, setSpotifyOk] = useState(false);
  const [backendMsg, setBackendMsg] = useState("Checking...");
  const [spotifyMsg, setSpotifyMsg] = useState("Checking...");
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    const result = await testFullConnection();

    setBackendOk(result.backend);
    setSpotifyOk(result.spotify);
    setBackendMsg(result.messages.backend);
    setSpotifyMsg(result.messages.spotify);

    if (result.spotify) {
      const spotifyTest = await testSpotifyToken();
      setUserInfo(spotifyTest.user);
    }

    setLoading(false);
  };

  const needsSpotifyTest = !isUriMode;
  const allSystemsReady = backendOk && (isUriMode || spotifyOk);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8">
      <h1 className="text-3xl font-black mb-8">System Test</h1>

      <div className="space-y-4">
        {/* Playback Mode Info */}
        <div className="card-surface rounded-2xl p-4 bg-primary/15 border border-primary/30">
          <p className="text-sm font-semibold text-primary">
            Mode: {isUriMode ? "🎵 Spotify URI Scheme" : "🔊 Web Playback SDK"}
          </p>
        </div>

        {/* Backend Test */}
        <div className={`card-surface rounded-2xl p-4 ${backendOk ? "ring-2 ring-success/50" : ""}`}>
          <div className="flex items-center gap-3 mb-2">
            {backendOk ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            <span className="font-bold text-lg">Backend</span>
          </div>
          <p className={`text-sm ${backendOk ? "text-success" : "text-destructive"}`}>
            {backendMsg}
          </p>
          {!backendOk && (
            <p className="text-xs text-muted-foreground mt-2">
              Run: <code className="bg-black/20 px-1">uv run python -m trackster.api.main</code>
            </p>
          )}
        </div>

        {/* Spotify Test - Only if SDK mode */}
        {needsSpotifyTest && (
          <div className={`card-surface rounded-2xl p-4 ${spotifyOk ? "ring-2 ring-success/50" : ""}`}>
            <div className="flex items-center gap-3 mb-2">
              {spotifyOk ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <AlertCircle className="h-6 w-6 text-destructive" />
              )}
              <span className="font-bold text-lg">Spotify</span>
            </div>
            <p className={`text-sm ${spotifyOk ? "text-success" : "text-destructive"}`}>
              {spotifyMsg}
            </p>

            {spotifyOk && userInfo && (
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>User ID:</strong> {userInfo.id}
                </p>
                <p>
                  <strong>Name:</strong> {userInfo.display_name}
                </p>
                <p>
                  <strong>Email:</strong> {userInfo.email}
                </p>
              </div>
            )}

            {!spotifyOk && (
              <p className="text-xs text-muted-foreground mt-2">
                Go back and click "Connect Spotify" to authorize access
              </p>
            )}
          </div>
        )}

        {/* URI Mode Ready Info */}
        {isUriMode && (
          <div className="card-surface rounded-2xl p-4 ring-2 ring-success/50">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <span className="font-bold text-lg text-success">Spotify Ready</span>
            </div>
            <p className="text-sm text-muted-foreground">
              URI mode requires no setup. Songs will open in your Spotify app.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className={`rounded-2xl p-4 text-center ${allSystemsReady ? "bg-success/15" : "bg-destructive/15"}`}>
          {allSystemsReady ? (
            <>
              <p className="text-success font-bold">✅ All systems ready!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can now <a href="/" className="underline">play the game</a>
              </p>
            </>
          ) : (
            <>
              <p className="text-destructive font-bold">⚠️ Setup incomplete</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please fix the issues above
              </p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={runTests}
        disabled={loading}
        className="mt-8 flex items-center justify-center gap-2 w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground glow-primary transition active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Testing..." : "Retest"}
      </button>

      <a href="/" className="mt-4 text-center text-sm text-muted-foreground hover:underline">
        Back to Game
      </a>
    </main>
  );
}
