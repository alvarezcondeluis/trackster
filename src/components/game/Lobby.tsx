import { Sparkles, Trash2, UserPlus, Music, CheckCircle } from "lucide-react";
import { Player } from "@/types/game";
import { useGameMode } from "@/hooks/useGameMode";
import { GAME_MODES } from "@/game/modes/registry";
import { EraSettings } from "@/components/settings/EraSettings";

interface LobbyProps {
  players: Player[];
  nameInput: string;
  setNameInput: (v: string) => void;
  addPlayer: () => void;
  removePlayer: (id: string) => void;
  startMatch: () => void;
  spotifyConnected: boolean;
  onConnectSpotify: () => void;
  isAuthenticating: boolean;
}

export function Lobby({
  players,
  nameInput,
  setNameInput,
  addPlayer,
  removePlayer,
  startMatch,
  spotifyConnected,
  onConnectSpotify,
  isAuthenticating,
}: LobbyProps) {
  const mode = GAME_MODES[useGameMode()];
  const { minPlayers, needsAudio } = mode;
  const needed = Math.max(0, minPlayers - players.length);
  // Playback is Web-SDK only, so audio modes need a connected Spotify session.
  const spotifyBlocking = needsAudio && !spotifyConnected;
  const canStart = players.length >= minPlayers && !spotifyBlocking;

  return (
    <section className="animate-slide-up flex flex-col gap-3">
      {/* One setup card: Spotify status + settings + add-player.
          relative z-20 keeps its dropdowns above the players list below
          (each card-surface has backdrop-filter → its own stacking context). */}
      <div className="card-surface relative z-20 space-y-3 rounded-2xl p-4">
        {/* Spotify connection only matters for audio modes (SDK playback).
            Audio-free modes (e.g. Higher or Lower) just compare metadata. */}
        {needsAudio && (
          <>
            {spotifyConnected ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Spotify Connected</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Music className="h-4 w-4" />
                  Connect to Spotify
                </span>
                <button
                  onClick={onConnectSpotify}
                  disabled={isAuthenticating}
                  className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground glow-primary transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isAuthenticating ? "Redirecting…" : "Connect"}
                </button>
              </div>
            )}

            <div className="h-px bg-border" />
          </>
        )}

        {/* Era filter always applies. */}
        <EraSettings />

        <div className="h-px bg-border" />

        {/* Add players */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-neon" /> Add your crew
          </div>
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Player name"
              className="flex-1 rounded-2xl border border-border bg-background/60 px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={addPlayer}
              aria-label="Add player"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform active:scale-95 glow-primary"
            >
              <UserPlus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Players list — scrolls internally so the page height stays fixed */}
      <div className="flex max-h-[30vh] flex-col gap-2 overflow-y-auto pr-1">
        {players.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {minPlayers <= 1
              ? "Add yourself to play solo — or bring friends."
              : `Add at least ${minPlayers} players to start the party.`}
          </div>
        )}
        {players.map((p, i) => (
          <div
            key={p.id}
            className="animate-pop-in card-surface flex items-center justify-between rounded-2xl px-4 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-black text-primary">
                {i + 1}
              </div>
              <span className="truncate text-base font-semibold">{p.name}</span>
            </div>
            <button
              onClick={() => removePlayer(p.id)}
              aria-label={`Remove ${p.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Start */}
      <button
        onClick={startMatch}
        disabled={!canStart}
        className="w-full rounded-2xl bg-neon py-4 text-lg font-black uppercase tracking-wide text-neon-foreground transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none enabled:glow-primary enabled:animate-pulse-glow"
      >
        {spotifyBlocking
          ? "Connect Spotify First"
          : canStart
            ? "Start Match 🎵"
            : `Need ${needed} more player${needed !== 1 ? "s" : ""}`}
      </button>
    </section>
  );
}
