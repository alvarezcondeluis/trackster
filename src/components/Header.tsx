import { Disc3 } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/20 glow-primary">
          <Disc3 className="h-6 w-6 text-primary animate-[spin_6s_linear_infinite]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-gradient-neon">
          Trackster
        </h1>
      </div>
      <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Party
      </span>
    </header>
  );
}
