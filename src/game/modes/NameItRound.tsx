/**
 * "Name It" mode — the song plays (hidden); the player types the title before
 * time runs out. Answer is fuzzy-matched (see game/matching). Works solo or in
 * turns: it's just the current player guessing, so no special multiplayer code.
 */

import { useState } from "react";
import { Eye, Play, Pause, Send, HelpCircle } from "lucide-react";

import { useTimer } from "@/hooks/useTimer";
import { playTrack, pauseTrack, stopTrack } from "@/services/unifiedPlayer";
import { isNameCorrect } from "@/game/matching";
import type { RoundProps } from "./types";

export function NameItRound({ songs, player, round, onResult }: RoundProps) {
  const song = songs[0];
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [guess, setGuess] = useState("");
  const [wrongShake, setWrongShake] = useState(false);
  const [outcome, setOutcome] = useState<null | "correct" | "revealed">(null);

  const timer = useTimer(isPlaying, 30, () => {
    setIsPlaying(false);
    stopTrack();
  });

  const togglePlay = () => {
    if (outcome) return;
    if (isPlaying) {
      pauseTrack().catch(() => {});
      setIsPlaying(false);
      timer.pause();
      return;
    }
    playTrack({
      spotifyUri: `spotify:track:${song.id}`,
      previewUrl: song.preview_url,
      songName: song.name,
    })
      .then(() => {
        setIsPlaying(true);
        setHasPlayed(true);
        timer.reset();
      })
      .catch((err) => console.error("❌ Failed to play:", err));
  };

  const submit = () => {
    if (!guess.trim() || outcome) return;
    if (isNameCorrect(guess, song)) {
      stopTrack();
      setIsPlaying(false);
      setOutcome("correct");
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 400);
      setGuess("");
    }
  };

  const giveUp = () => {
    stopTrack();
    setIsPlaying(false);
    setOutcome("revealed");
  };

  // Reveal / result screen
  if (outcome) {
    const correct = outcome === "correct";
    return (
      <section className="animate-slide-up flex flex-col gap-3">
        <RoundHeader round={round} player={player} />
        <div className="card-surface animate-pop-in rounded-3xl p-4 text-center">
          {song.album_art_url && (
            <img
              src={song.album_art_url}
              alt={song.album_name || "Album art"}
              className="mx-auto mb-3 block aspect-square w-full max-w-[180px] rounded-2xl object-cover shadow-lg"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <div
            className={`text-sm font-bold uppercase tracking-widest ${
              correct ? "text-success" : "text-destructive"
            }`}
          >
            {correct ? "✅ Correct!" : "❌ Revealed"}
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{song.name}</h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {song.artist_name}
            {song.year ? ` · ${song.year}` : ""}
          </p>
        </div>
        <button
          onClick={() => onResult({ correct, points: correct ? 1 : 0 })}
          className="w-full rounded-2xl bg-neon py-4 text-lg font-black uppercase tracking-wide text-neon-foreground glow-primary transition active:scale-[0.98]"
        >
          Continue
        </button>
      </section>
    );
  }

  // Guessing screen
  return (
    <section className="animate-slide-up flex flex-col gap-3">
      <RoundHeader round={round} player={player} />

      {/* Mystery card */}
      <div className="card-surface relative overflow-hidden rounded-3xl p-4 animate-pop-in">
        <div className="mx-auto grid aspect-square w-full max-w-[160px] place-items-center rounded-2xl bg-gradient-to-br from-primary/40 via-cyan/20 to-neon/30">
          <div className="relative">
            <div className="text-7xl blur-md opacity-60 select-none">🎵</div>
            <HelpCircle className="absolute inset-0 m-auto h-14 w-14 text-foreground drop-shadow-[0_0_20px_rgb(255_255_255_/0.5)]" />
          </div>
        </div>

        {/* Play + timer */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground glow-primary transition active:scale-95"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
          </button>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-cyan to-neon"
                style={{ width: `${(100 * (30 - timer.timeLeft)) / 30}%` }}
              />
            </div>
          </div>
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: timer.timeLeft <= 5 ? "#ef4444" : "#10b981" }}
          >
            {timer.timeLeft}s
          </span>
        </div>
      </div>

      {/* Guess input */}
      <div className={`flex gap-2 ${wrongShake ? "animate-[shake_0.4s]" : ""}`}>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={hasPlayed ? "Type the song title…" : "Press play, then guess"}
          className="flex-1 rounded-2xl border border-border bg-background/60 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={submit}
          aria-label="Submit guess"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition active:scale-95 glow-primary"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={giveUp}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted py-3 text-sm font-bold uppercase tracking-wide text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive active:scale-[0.98]"
      >
        <Eye className="h-4 w-4" /> Give up / Reveal
      </button>
    </section>
  );
}

function RoundHeader({ round, player }: { round: number; player: RoundProps["player"] }) {
  return (
    <div className="flex items-center justify-between">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Round {round}
      </span>
      <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-bold text-primary">{player.name}</span>
      </div>
    </div>
  );
}
