import { Check, X } from "lucide-react";
import { Player, Song } from "@/types/game";

interface RevealedProps {
  player: Player;
  song: Song | null;
  onScore: (correct: boolean) => void;
}

export function Revealed({ player, song, onScore }: RevealedProps) {
  if (!song) return null;

  return (
    <section className="animate-slide-up flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Solution
        </span>
        <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold text-primary">{player.name}</span>
        </div>
      </div>

      <div className="card-surface animate-pop-in rounded-3xl p-4">
        {/* Album Art or Fallback — capped small so the screen fits */}
        {song?.album_art_url ? (
          <img
            src={song.album_art_url}
            alt={song.album_name || "Album art"}
            className="mx-auto block aspect-square w-full max-w-[200px] rounded-2xl object-cover shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="mx-auto grid aspect-square w-full max-w-[200px] place-items-center rounded-2xl bg-gradient-to-br from-primary/50 via-cyan/30 to-neon/40 text-8xl">
            🎵
          </div>
        )}
        <div className="mt-3 space-y-1 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-neon">
            {song.year}
          </div>
          <h2 className="text-2xl font-black tracking-tight">{song.name}</h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {song.artist_name}
          </p>
          {song.genres && song.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {song.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onScore(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-success py-5 font-black text-success-foreground glow-success transition active:scale-95"
        >
          <Check className="h-6 w-6" strokeWidth={3} />
          <span className="text-sm uppercase tracking-wide">Correct</span>
          <span className="text-xs opacity-80">+1 Point</span>
        </button>
        <button
          onClick={() => onScore(false)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-destructive py-5 font-black text-destructive-foreground glow-destructive transition active:scale-95"
        >
          <X className="h-6 w-6" strokeWidth={3} />
          <span className="text-sm uppercase tracking-wide">Incorrect</span>
          <span className="text-xs opacity-80">Pass</span>
        </button>
      </div>
    </section>
  );
}
