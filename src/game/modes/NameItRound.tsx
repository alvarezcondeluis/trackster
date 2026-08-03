/**
 * "Name It" mode — same view as Classic (blurred album art + player), but the
 * player types the title before time runs out instead of self-scoring. Answer
 * is fuzzy-matched (see game/matching). Works solo or in turns.
 */

import { useState } from "react";
import { Send } from "lucide-react";

import { AlbumArt } from "@/components/game/AlbumArt";
import { Button } from "@/components/ui/button";
import { Playing } from "@/components/game/Playing";
import { stopTrack } from "@/services/unifiedPlayer";
import { rateSong } from "@/services/api";
import { isNameCorrect } from "@/game/matching";
import { useSongArt } from "@/hooks/useSongArt";
import type { Song } from "@/types/game";
import type { RoundProps } from "./types";

export function NameItRound({ songs, player, round, onResult }: RoundProps) {
  const song = songs[0];
  // Lazily fetch art (batch songs may arrive without it) so the reveal shows the
  // real cover, not just song.album_art_url which is often empty here.
  const artUrl = useSongArt(song);
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
            <span className="text-sm font-bold text-primary">
              {player.name}
            </span>
          </div>
        </div>
        <div className="card-surface animate-pop-in rounded-3xl p-4 text-center">
          <AlbumArt
            src={artUrl}
            alt={song.album_name || "Album art"}
            className="mx-auto mb-3 block aspect-square w-full max-w-[180px] rounded-2xl object-cover shadow-lg"
          />
          <div
            className={`text-sm font-bold uppercase tracking-widest ${
              correct ? "text-success" : "text-destructive"
            }`}
          >
            {correct ? "✅ Correct!" : "❌ Revealed"}
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {song.name}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {song.artist_name}
            {song.year ? ` · ${song.year}` : ""}
          </p>
        </div>
        <RatingBar song={song} />
        <Button
          variant="action"
          size="action"
          onClick={() => onResult({ correct, points: correct ? 1 : 0 })}
        >
          Continue
        </Button>
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

/**
 * Reveal-screen rating picker: choose an absolute 0..5 score for this song.
 * 0 bans it from future games; 1..5 bias how often it's picked. Optional and
 * non-blocking — the pick is fire-and-forget, failures only log.
 */
function RatingBar({ song }: { song: Song }) {
  const [rated, setRated] = useState<number | null>(null);

  const rate = (score: number) => {
    setRated(score); // optimistic: highlight immediately
    rateSong(song.id, score).catch((e) =>
      console.error("Failed to rate song", e),
    );
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Rate this song
      </span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = rated === n;
          const highlight =
            n === 1
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground glow-primary";
          return (
            <button
              key={n}
              onClick={() => rate(n)}
              title={n === 1 ? "Ban — never show again" : `Rate ${n} / 5`}
              className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black transition active:scale-90 ${
                selected
                  ? highlight
                  : "card-surface text-muted-foreground hover:text-foreground hover:ring-2 hover:ring-primary/40"
              }`}
            >
              {n === 1 ? "🚫" : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
