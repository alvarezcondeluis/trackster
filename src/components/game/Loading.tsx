/**
 * Loading card — an animated placeholder shown while a round's song(s) fetch.
 * A glowing vinyl + an equalizer bar animation, far friendlier than plain text.
 */

interface LoadingProps {
  label?: string;
}

export function Loading({ label = "Loading song…" }: LoadingProps) {
  return (
    <div className="card-surface animate-pop-in flex flex-col items-center gap-5 rounded-3xl p-8">
      {/* Glowing vinyl */}
      <div className="relative grid h-20 w-20 place-items-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-cyan to-neon animate-pulse-glow" />
        <div className="absolute inset-[6px] rounded-full bg-background/70" />
        <div className="absolute inset-0 grid place-items-center text-3xl animate-[spin_5s_linear_infinite]">
          🎵
        </div>
      </div>

      {/* Equalizer bars */}
      <div className="flex h-8 items-end gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-2 rounded-full bg-gradient-to-t from-primary to-neon animate-equalize"
            style={{ height: "100%", animationDelay: `${i * 0.13}s` }}
          />
        ))}
      </div>

      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
