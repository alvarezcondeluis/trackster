/**
 * Main Game component
 * Orchestrates game flow, player management, and song fetching
 */

import { useEffect, useState } from "react";
import { GameState, Player, Song } from "@/types/game";
import { fetchRandomSong, checkBackendHealth } from "@/services/api";
import { startSpotifyAuth, getStoredToken, clearToken } from "@/services/spotifyAuth";
import { usePlaybackMode } from "@/hooks/usePlaybackMode";
import { useEra } from "@/hooks/useEra";
import { loadSpotifySDK, initializePlayer, startDeviceMonitor, isPlayerReady } from "@/services/spotifyWebSdk";
import { Lobby } from "./Lobby";
import { Playing } from "./Playing";
import { Revealed } from "./Revealed";
import { Leaderboard } from "./Leaderboard";
import { AlertCircle } from "lucide-react";

export function Game() {
  // Game state
  const [gameState, setGameState] = useState<GameState>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [round, setRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);  // Show loading while checking
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Reactive playback mode — updates live when the user toggles it in the Lobby
  const playbackMode = usePlaybackMode();
  const isSdkMode = playbackMode === "sdk";

  // Reactive era filter — which years of music are eligible
  const era = useEra();

  const currentPlayer = players[turnIndex];

  // Effect A: backend health check (runs once on mount)
  useEffect(() => {
    const checkBackend = async () => {
      console.log("📱 Initializing app...");
      setIsCheckingBackend(true);

      let isHealthy = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`🔍 Backend health check (attempt ${attempt + 1}/3)...`);
          isHealthy = await checkBackendHealth();
          if (isHealthy) {
            console.log("✅ Backend is healthy");
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`❌ Health check attempt ${attempt + 1} failed:`, err);
        }
      }

      setBackendConnected(isHealthy);
      setIsCheckingBackend(false);
      if (!isHealthy) {
        setError("Cannot connect to backend. Is FastAPI running on port 8000?");
      }
    };

    checkBackend();
  }, []);

  // Effect B: Spotify player setup — re-runs whenever the playback mode changes,
  // so switching modes applies live without a page reload.
  useEffect(() => {
    const initPlayback = async () => {
      console.log(`🎵 Playback Pipeline: ${isSdkMode ? "🎵 SDK (Full Songs)" : "⚡ Preview (30s clips)"}`);

      // Preview mode needs no Spotify connection
      if (!isSdkMode) {
        setSpotifyConnected(true);
        return;
      }

      // Already have a live player from a previous init — reuse it
      if (isPlayerReady()) {
        setSpotifyConnected(true);
        return;
      }

      // SDK mode: load SDK, then init the player if we have a stored token
      try {
        console.log("📥 Loading Spotify SDK...");
        await loadSpotifySDK();
        console.log("✅ Spotify SDK loaded");
      } catch (err) {
        console.error("❌ Failed to load Spotify SDK:", err);
        setError("Failed to load Spotify SDK");
        return;
      }

      const token = getStoredToken();
      if (!token) {
        // No token yet — user must click "Connect Spotify"
        setSpotifyConnected(false);
        return;
      }

      try {
        console.log("🎵 Initializing Spotify player with existing token...");
        await initializePlayer(token);
        setSpotifyConnected(true);
        startDeviceMonitor();
        console.log("👁️ Device monitor started");
      } catch (err) {
        console.error("❌ Failed to initialize player:", err);

        // Dead token (expired / wrong scope). Clear it so the UI shows
        // "Connect Spotify" instead of pretending we're connected.
        const isAuthError =
          err instanceof Error && err.message.includes("Authentication");
        if (isAuthError) {
          console.warn("🔑 Stored token is invalid — clearing it. Please reconnect.");
          clearToken();
          setError("Your Spotify session expired. Please reconnect Spotify.");
        }
        setSpotifyConnected(false);
      }
    };

    initPlayback();
  }, [playbackMode, isSdkMode]);

  // Fetch a random song when entering playing state
  useEffect(() => {
    if (gameState === "playing" && !currentSong) {
      fetchSong();
    }
  }, [gameState, currentSong]);

  const fetchSong = async () => {
    if (!backendConnected) {
      setError("Backend not connected");
      return;
    }

    setIsLoading(true);
    setError(null);

    const t0 = performance.now();
    try {
      // SDK mode plays by track ID, so it doesn't need a preview URL — skip the
      // backend's preview hunt. Preview mode needs one.
      const song = await fetchRandomSong("medium", era, !isSdkMode);
      const ms = Math.round(performance.now() - t0);
      console.log(`⏱️ Song ready in ${ms}ms (era: ${era}) — ${song.name} · ${song.artist_name}`);
      setCurrentSong(song);
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      const message = err instanceof Error ? err.message : "Failed to fetch song";
      setError(message);
      console.error(`❌ Song fetch failed after ${ms}ms:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const addPlayer = () => {
    const name = nameInput.trim();
    if (!name) return;
    setPlayers((p) => [...p, { id: crypto.randomUUID(), name, score: 0 }]);
    setNameInput("");
  };

  const removePlayer = (id: string) => {
    setPlayers((p) => p.filter((x) => x.id !== id));
  };

  const handleSpotifyConnect = async () => {
    if (spotifyConnected) {
      // Already connected
      return;
    }

    setIsAuthenticating(true);
    try {
      console.log("🔐 Starting Spotify authentication...");
      await startSpotifyAuth();
      // This will redirect to Spotify OAuth callback, so we don't need to do anything after
      // The callback page will handle initializing the player
    } catch (err) {
      console.error("❌ Authentication error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start Spotify authentication"
      );
      setIsAuthenticating(false);
    }
  };

  const startMatch = () => {
    if (!spotifyConnected && isSdkMode) {
      setError("Please connect to Spotify first");
      return;
    }

    setRound(1);
    setTurnIndex(0);
    setCurrentSong(null);
    setGameState("playing");
  };

  const scorePoint = (correct: boolean) => {
    if (correct && currentPlayer) {
      setPlayers((p) =>
        p.map((x) =>
          x.id === currentPlayer.id ? { ...x, score: x.score + 1 } : x
        )
      );
    }
    setGameState("leaderboard");
  };

  const nextTurn = () => {
    const next = (turnIndex + 1) % players.length;
    if (next === 0) setRound((r) => r + 1);
    setTurnIndex(next);
    setCurrentSong(null);
    setGameState("playing");
  };


  // Loading while checking backend
  if (isCheckingBackend) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 pb-10 pt-8">
        <div className="text-center space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 glow-primary mx-auto">
            <svg
              className="h-8 w-8 text-primary animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.3" />
              <path d="M12 2C6.48 2 2 6.48 2 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">Initializing Trackster...</h2>
            <p className="text-sm text-muted-foreground mt-1">Connecting to backend</p>
          </div>
        </div>
      </main>
    );
  }

  // Error display (only after checking is done)
  if (!backendConnected) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8">
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Backend Error</div>
            <div className="text-sm text-destructive/80">{error}</div>
            <div className="text-xs text-destructive/60 mt-2">
              Make sure FastAPI is running: <code className="bg-black/20 px-2 py-1 rounded">uv run python -m trackster.api.main</code>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/20 glow-primary">
            <svg
              className="h-6 w-6 text-primary animate-[spin_6s_linear_infinite]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" opacity="0.3" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gradient-neon">
            Trackster
          </h1>
        </div>
        <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Party
        </span>
      </header>

      {error && gameState !== "setup" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {isLoading && gameState === "playing" && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Loading song...
        </div>
      )}

      <div className="mt-6 flex-1">
        {gameState === "setup" && (
          <Lobby
            players={players}
            nameInput={nameInput}
            setNameInput={setNameInput}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            startMatch={startMatch}
            spotifyConnected={spotifyConnected}
            onConnectSpotify={handleSpotifyConnect}
            isAuthenticating={isAuthenticating}
          />
        )}
        {gameState === "playing" && currentPlayer && (
          <Playing
            round={round}
            player={currentPlayer}
            song={currentSong}
            onReveal={() => setGameState("revealed")}
          />
        )}
        {gameState === "revealed" && currentPlayer && (
          <Revealed
            player={currentPlayer}
            song={currentSong}
            onScore={scorePoint}
          />
        )}
        {gameState === "leaderboard" && (
          <Leaderboard players={players} round={round} onNext={nextTurn} />
        )}
      </div>
    </main>
  );
}
