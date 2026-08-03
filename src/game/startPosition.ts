// Anchors as fractions of the track (0 = start). 4s is special-cased below.
const ANCHORS = [0.0, 0.2, 0.35] as const;

/** Choose where to start playback, in ms. Always leaves ≥30s of song after. */
export function pickStartMs(durationMs?: number): number {
  if (!durationMs || durationMs < 30_000) return 4000; // fallback: current behavior

  const frac = ANCHORS[Math.floor(Math.random() * ANCHORS.length)];
  const raw = frac === 0 ? 4000 : Math.floor(durationMs * frac);

  // Guardrail: never start so late the song ends before they can guess.
  const latest = durationMs - 30_000; // keep ≥30s of runway
  return Math.min(raw, Math.max(4000, latest));
}
