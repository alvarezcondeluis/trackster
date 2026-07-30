/**
 * "Higher or Lower" mode — two songs; pick the one with higher Spotify
 * popularity. After picking, both scores reveal and the round reports the
 * result. This mode is metadata-only: no audio, so it never touches Spotify.
 */

import { useState } from "react";
import { TrendingUp } from "lucide-react";

import type { Song } from "@/types/game";
import type { RoundProps } from "./types";

/**
 * The signal players compare. Today it's Spotify's 0–100 popularity — the only
 * metric in our dataset. To compare something else later (e.g. monthly
 * listeners from a third-party source), add the field to Song and change only
 * these two lines; the round below is metric-agnostic.
 */
const METRIC = {
  label: "popular",
  value: (song: Song) => song.popularity ?? 0,
};

export function HigherLowerRound({ songs, player, round, onResult }: RoundProps) {
  const [a, b] = songs;
  const [picked, setPicked] = useState<null | "a" | "b">(null);

  const correctKey: "a" | "b" = METRIC.value(a) >= METRIC.value(b) ? "a" : "b";
  const revealed = picked !== null;
  const correct = picked === correctKey;

  const pick = (key: "a" | "b") => {
    if (revealed) return;
    setPicked(key);
  };

  return (
    <section className="animate-slide-up flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Round {round} · Higher or Lower
        </span>
        <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold text-primary">{player.name}</span>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-muted-foreground">
        Which song is <span className="text-primary">more {METRIC.label}</span>?
      </p>

      <div className="grid grid-cols-2 gap-3">
        <SongPick
          song={a}
          revealed={revealed}
          isCorrect={correctKey === "a"}
          isPicked={picked === "a"}
          onPick={() => pick("a")}
        />
        <SongPick
          song={b}
          revealed={revealed}
          isCorrect={correctKey === "b"}
          isPicked={picked === "b"}
          onPick={() => pick("b")}
        />
      </div>

      {revealed && (
        <>
          <div
            className={`card-surface rounded-2xl p-3 text-center text-sm font-bold ${
              correct ? "text-success" : "text-destructive"
            }`}
          >
            {correct ? "✅ Correct!" : "❌ Not quite"}
          </div>
          <button
            onClick={() => onResult({ correct, points: correct ? 1 : 0 })}
            className="w-full rounded-2xl bg-neon py-4 text-lg font-black uppercase tracking-wide text-neon-foreground glow-primary transition active:scale-[0.98]"
          >
            Continue
          </button>
        </>
      )}
    </section>
  );
}

function SongPick({
  song,
  revealed,
  isCorrect,
  isPicked,
  onPick,
}: {
  song: Song;
  revealed: boolean;
  isCorrect: boolean;
  isPicked: boolean;
  onPick: () => void;
}) {
  // Highlight after reveal: green for the correct one, red if wrongly picked.
  const ring = revealed
    ? isCorrect
      ? "ring-2 ring-success"
      : isPicked
        ? "ring-2 ring-destructive"
        : "opacity-70"
    : "hover:ring-2 hover:ring-primary/50";

  return (
    <button
      onClick={onPick}
      disabled={revealed}
      className={`card-surface flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${ring}`}
    >
      {song.album_art_url ? (
        <img
          src={song.album_art_url}
          alt={song.album_name || "Album art"}
          className="aspect-square w-full rounded-xl object-cover shadow"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center rounded-xl bg-gradient-to-br from-primary/40 to-neon/30 text-4xl">
          🎵
        </div>
      )}

      <div className="min-h-[2.5rem]">
        <div className="line-clamp-1 text-sm font-black">{song.name}</div>
        <div className="line-clamp-1 text-xs text-muted-foreground">{song.artist_name}</div>
      </div>

      {revealed ? (
        <div className="flex items-center gap-1 text-sm font-black text-primary">
          <TrendingUp className="h-4 w-4" /> {METRIC.value(song)}
        </div>
      ) : (
        <span className="text-xs font-bold text-muted-foreground">Tap to pick</span>
      )}
    </button>
  );
}
