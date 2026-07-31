/**
 * "Name It" mode — same view as Classic (blurred album art + player), but the
 * player types the title before time runs out instead of self-scoring. Answer
 * is fuzzy-matched (see game/matching). Works solo or in turns.
 */

import { useState } from "react";
import { Send } from "lucide-react";

import { Playing } from "@/components/game/Playing";
import { stopTrack } from "@/services/unifiedPlayer";
import { isNameCorrect } from "@/game/matching";
import type { RoundProps } from "./types";

export function NameItRound({ songs, player, round, onResult }: RoundProps) {
  const song = songs[0];
  const [guess, setGuess] = useState("");
  const [wrongShake, setWrongShake] = useState(false);
  const [outcome, setOutcome] = useState<null | "correct" | "revealed">(null);

  const submit = () => {
    if (!guess.trim() || outcome) return;
    if (isNameCorrect(guess, song)) {
      stopTrack();
      setOutcome("correct");
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 400);
      setGuess("");
    }
  };

  const giveUp = () => {
    stopTrack();
    setOutcome("revealed");
  };

  // Reveal / result screen
  if (outcome) {
    const correct = outcome === "correct";
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

  // Guessing screen — identical to Classic's view, plus the guess input.
  return (
    <Playing
      round={round}
      player={player}
      song={song}
      onReveal={giveUp}
      revealLabel="Give up / Reveal"
      keepHiddenOnTimeUp
    >
      <div className={`flex gap-2 ${wrongShake ? "animate-[shake_0.4s]" : ""}`}>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type the song title…"
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
    </Playing>
  );
}
