/**
 * Mode-select screen — the first step. Lists every registered game mode as a
 * card. Driven entirely by the registry, so new modes appear automatically.
 */

import { GAME_MODE_LIST } from "@/game/modes/registry";
import type { GameModeId } from "@/game/modes/types";

interface ModeSelectProps {
  current: GameModeId;
  onChoose: (id: GameModeId) => void;
}

export function ModeSelect({ current, onChoose }: ModeSelectProps) {
  return (
    <section className="animate-slide-up flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-gradient-neon">
          Choose a mode
        </h2>
        <p className="text-sm text-muted-foreground">Pick how you want to play.</p>
      </div>

      {GAME_MODE_LIST.map((mode) => {
        const active = mode.id === current;
        const solo = mode.minPlayers <= 1;
        return (
          <button
            key={mode.id}
            onClick={() => onChoose(mode.id)}
            className={`group card-surface relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] ${
              active ? "ring-2 ring-primary" : "ring-1 ring-transparent hover:ring-primary/40"
            }`}
          >
            {/* Color wash — invisible until hover (or when active) */}
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                active ? "opacity-60" : ""
              }`}
            />

            <div className="relative flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-3xl shadow-inner transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                {mode.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black">{mode.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      solo
                        ? "bg-neon/20 text-neon"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {solo ? "Solo OK" : "2+ players"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{mode.description}</p>
              </div>

              <span className="shrink-0 translate-x-0 text-lg text-muted-foreground opacity-40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100">
                ▶
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
