/**
 * Playback Settings — compact dropdown
 * Shows the current mode; tap to reveal the two options stacked in a small
 * popover that grows out of the button. Applies live (no reload).
 */

import { useEffect, useRef, useState } from "react";

import { setPlaybackMode } from "@/config/playback";
import { usePlaybackMode } from "@/hooks/usePlaybackMode";

const OPTIONS = [
  { value: "preview", label: "Preview", icon: "⚡", hint: "Instant · 30-second clips" },
  { value: "sdk", label: "Full Song", icon: "🎵", hint: "Full songs" },
] as const;

export function PlaybackSettings() {
  const mode = usePlaybackMode();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">Playback</h3>

      <p className="text-xs text-muted-foreground">{current.hint}</p>

      <div ref={wrapRef} className="relative">
        {/* Trigger — shows the current mode */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-background/40 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-background/60"
        >
          <span className="flex items-center gap-2">
            <span>{current.icon}</span>
            {current.label}
          </span>
          <span
            className={`text-xs text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {/* Popover — two options stacked, grows out of the button */}
        {open && (
          <div
            role="listbox"
            className="animate-menu-in absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
          >
            {OPTIONS.map((opt) => {
              const active = opt.value === mode;
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setPlaybackMode(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
