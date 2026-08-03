/**
 * Era Settings — compact dropdown
 * Shows the current era; tap to reveal all eras in a small popover.
 * Applies live (no reload) via the reactive era setting.
 */

import { useEffect, useRef, useState } from "react";

import { ERAS, setEra } from "@/config/era";
import { useEra } from "@/hooks/useEra";

export function EraSettings() {
  const era = useEra();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = ERAS.find((e) => e.key === era) ?? ERAS[0];

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
      <h3 className="text-lg font-bold">Era</h3>
      <p className="text-xs text-muted-foreground">
        Only songs from this period.
      </p>
      <div ref={wrapRef} className="relative">
        {/* Trigger — shows the current era */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-background/40 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-background/60"
        >
          <span className="flex items-center gap-2">
            <span>📅</span>
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

        {/* Popover — all eras stacked, grows out of the button */}
        {open && (
          <div
            role="listbox"
            className="animate-menu-in absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl"
          >
            {ERAS.map((opt) => {
              const active = opt.key === era;
              return (
                <button
                  key={opt.key}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setEra(opt.key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
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
