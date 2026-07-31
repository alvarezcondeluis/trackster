import { Eye, HelpCircle, Music2, Pause, Play } from "lucide-react";
import { Player, Song } from "@/types/game";
import { useTimer } from "@/hooks/useTimer";
import { useState, type ReactNode } from "react";
import { playTrack, pauseTrack, stopTrack } from "@/services/unifiedPlayer";

interface PlayingProps {
  round: number;
  player: Player;
  song: Song | null;
  onReveal: () => void;
  /** Label for the reveal button (default "Reveal Answer"). */
  revealLabel?: string;
  /**
   * Keep the album art hidden even after the timer ends. Classic un-blurs the
   * art on time-up; "Name It" keeps it hidden so the answer isn't leaked while
   * the player is still typing. Defaults to false (classic behavior).
   */
  keepHiddenOnTimeUp?: boolean;
  /** Extra controls rendered under the player (e.g. the "Name It" guess input). */
  children?: ReactNode;
}

export function Playing({
  round,
  player,
  song,
  onReveal,
  revealLabel = "Reveal Answer",
  keepHiddenOnTimeUp = false,
  children,
}: PlayingProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [timeIsUp, setTimeIsUp] = useState(false);

  const timer = useTimer(isPlaying, 30, () => {
    setIsPlaying(false);
    setTimeIsUp(true);

    // Stop playback when timer ends (works for both methods)
    stopTrack();

    // Don't auto-reveal — let user click "Reveal Answer"
  });

  const handlePlay = () => {
    // Disable play until song is loaded
    if (!song) return;

    if (!isPlaying) {
      // Check if we can play at all
      if (!song.id) {
        console.error("❌ Song missing Spotify ID");
        return;
      }

      const spotifyUri = `spotify:track:${song.id}`;

      // Play the full song via the Spotify Web SDK.
      playTrack({ spotifyUri, songName: song.name })
        .then(() => {
          setIsPlaying(true);
          setHasPlayed(true);
          setTimeIsUp(false);
          timer.reset();
        })
        .catch((err) => {
          console.error("❌ Failed to play song:", err);
          alert(`🎵 Playback error: ${err instanceof Error ? err.message : "Unknown error"}`);
        });
    } else {
      // Pause with optimistic update (instant UI feedback)
      // Update UI immediately for instant response
      setIsPlaying(false);
      timer.pause();

      // Then sync with Spotify in background
      pauseTrack()
        .catch((err) => {
          console.error("❌ Failed to pause:", err);
          // If pause fails, resume (user sees pause failed)
          setIsPlaying(true);
          timer.resume();
        });
    }
  };

  // Show the real (un-blurred) art only when the timer ends AND the mode allows
  // it. "Name It" keeps it hidden the whole time so the answer isn't leaked.
  const showAnswerArt = timeIsUp && !keepHiddenOnTimeUp;

  return (
    <section className="animate-slide-up flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Round {round}
        </span>
        <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold text-primary">{player.name}</span>
        </div>
      </div>

      {/* Album Art or Mystery Card - BLUR while content is hidden */}
      <div className="card-surface relative overflow-hidden rounded-3xl p-4 animate-pop-in">
        {song?.album_art_url ? (
          // Show album art (blurred during mystery phase) — capped small since
          // it's hidden while guessing; the full-size art shows on Reveal.
          <div className="relative mx-auto w-full max-w-[200px]">
            <img
              src={song.album_art_url}
              alt={song.album_name || "Album art"}
              className={`w-full aspect-square object-cover rounded-2xl shadow-lg transition-all ${
                showAnswerArt ? "blur-none" : "blur-3xl opacity-30 scale-110"
              }`}
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = "none";
              }}
            />
            {/* Playback badge */}
            <div className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white">
              🎵 SDK
            </div>
            {/* Mystery overlay while the answer is still hidden */}
            {!showAnswerArt && (
              <div className="absolute inset-0 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">🎵</div>
                  <div className="text-sm font-semibold text-white/80">Playing...</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Fallback mystery card
          <div className="mx-auto grid aspect-square w-full max-w-[200px] place-items-center rounded-2xl bg-gradient-to-br from-primary/40 via-cyan/20 to-neon/30">
            <div className="relative">
              <div className="text-8xl blur-md opacity-60 select-none">🎵</div>
              <HelpCircle className="absolute inset-0 m-auto h-16 w-16 text-foreground drop-shadow-[0_0_20px_rgb(255_255_255_/0.5)]" />
            </div>
          </div>
        )}

        {/* Song Info - ALWAYS hidden until reveal (compact placeholder) */}
        <div className="mt-3 space-y-1 text-center">
          <div className="text-lg font-black tracking-widest text-foreground/40 blur-[3px] select-none">
            ??? ??? ???
          </div>
          <div className="text-[11px] text-muted-foreground/50">
            {hasPlayed ? "🎵 Full song via SDK" : "Ready to play"}
          </div>
        </div>
      </div>

      {/* Timer display */}
      {hasPlayed && (
        <div className="card-surface rounded-2xl p-4 text-center">
          <div className="text-5xl font-black" style={{
            color: timer.timeLeft <= 5 ? '#ef4444' : '#10b981'
          }}>
            {timer.timeLeft}s
          </div>
          <div className="text-sm font-semibold text-muted-foreground mt-2">
            {timer.isRunning ? 'Listening...' : timeIsUp ? 'Time\'s up!' : 'Paused'}
          </div>
        </div>
      )}

      {/* Playback controls */}
      <div className="card-surface flex items-center gap-4 rounded-2xl p-4">
        <button
          onClick={handlePlay}
          disabled={!song}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition active:scale-95 ${
            song
              ? "bg-primary text-primary-foreground glow-primary cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Music2 className="h-3.5 w-3.5" />{" "}
            {isPlaying ? "Now playing..." : hasPlayed ? "Paused" : "Ready to play"}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-primary via-cyan to-neon ${
                isPlaying ? "animate-progress" : ""
              }`}
              style={{
                width: `${(100 * (30 - timer.timeLeft)) / 30}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Mode-specific controls (e.g. the "Name It" guess input) */}
      {children}

      {/* Button: Reveal Answer (always available after song plays) */}
      {hasPlayed && (
        <>
          {!isPlaying && (
            <button
              onClick={onReveal}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-neon py-5 text-lg font-black uppercase tracking-wide text-neon-foreground glow-primary transition active:scale-[0.98]"
            >
              <Eye className="h-5 w-5" /> {revealLabel}
            </button>
          )}

          {/* Status: Listening while playing */}
          {isPlaying && (
            <div className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-muted py-5 text-lg font-black uppercase tracking-wide text-muted-foreground/70">
              <Music2 className="h-5 w-5 animate-spin" /> Listening...
            </div>
          )}
        </>
      )}
    </section>
  );
}
