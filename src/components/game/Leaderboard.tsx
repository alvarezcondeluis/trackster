import { Crown, SkipForward, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Player } from "@/types/game";

interface LeaderboardProps {
  players: Player[];
  round: number;
  onNext: () => void;
}

export function Leaderboard({ players, round, onNext }: LeaderboardProps) {
  const ranked = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );
  const topScore = ranked[0]?.score ?? 0;

  return (
    <section className="animate-slide-up flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Round {round} · Standings
        </span>
        <Trophy className="h-5 w-5 text-neon" />
      </div>

      <ol className="flex flex-col gap-2">
        {ranked.map((p, i) => {
          const isLeader = p.score === topScore && topScore > 0;
          return (
            <li
              key={p.id}
              className={`card-surface animate-pop-in flex items-center justify-between rounded-2xl px-4 py-4 ${
                isLeader ? "ring-2 ring-neon/70 glow-cyan" : ""
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${
                    isLeader
                      ? "bg-neon text-neon-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isLeader ? <Crown className="h-5 w-5" /> : i + 1}
                </div>
                <span className="truncate text-base font-semibold">{p.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black ${
                    isLeader ? "text-neon" : "text-foreground"
                  }`}
                >
                  {p.score}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">pts</span>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        onClick={onNext}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 text-lg font-black uppercase tracking-wide text-primary-foreground glow-primary transition active:scale-[0.98]"
      >
        <SkipForward className="h-5 w-5" /> Play Next Song
      </button>
    </section>
  );
}
