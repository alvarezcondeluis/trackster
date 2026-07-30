/**
 * Fuzzy answer matching for the "Name It" mode.
 *
 * Pure and dependency-free so it's trivially unit-testable. The strategy:
 *   1. Normalize both strings (lowercase, strip accents, drop "(Remastered)",
 *      "feat. …", punctuation) so cosmetic differences don't matter.
 *   2. Compare with a Levenshtein similarity ratio against a threshold.
 * Title match is the primary signal; artist is accepted a bit more strictly.
 */

import type { Song } from "@/types/game";

/** Lowercase, strip accents/parentheticals/"feat"/punctuation, collapse spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\(.*?\)|\[.*?\]/g, "") // drop "(Remastered)", "[Live]"
    .replace(/\bfeat\.?.*$/g, "") // drop "feat. …"
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity in [0,1]: 1 = identical, 0 = completely different. */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Is the typed guess a good-enough match for the song's title (or artist)?
 * @param threshold title-match ratio required (default 0.8)
 */
export function isNameCorrect(guess: string, song: Song, threshold = 0.8): boolean {
  const g = normalize(guess);
  if (g.length < 2) return false;

  const title = normalize(song.name);
  const artist = normalize(song.artist_name);

  // A confident substring hit counts (e.g. guessing the core title of a long name).
  if (g.length >= 4 && (title.includes(g) || g.includes(title))) return true;

  return similarity(g, title) >= threshold || similarity(g, artist) >= 0.85;
}
