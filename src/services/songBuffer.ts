/**
 * Song buffer — serves rounds from a client-side queue so we hit the DB rarely.
 *
 * Flow: once per match we fetch the total count for the current filter, then each
 * refill rolls a random offset against that total and pulls a small window. Rounds
 * pop from the queue; a background refill tops it up when it runs low.
 */

import { fetchTotalSongs, fetchRandomSongs } from "./api";
import type { Song } from "@/types/game";
import type { EraKey } from "@/config/era";

type Difficulty = "easy" | "medium" | "hard";

const BATCH_SIZE = 50;
const REFILL_AT = 10;

let buffer: Song[] = [];
let bufferKey = "";
let total = 0; // cached count for the current filter
let inflight: Promise<void> | null = null;

const keyOf = (d: Difficulty, e: EraKey) => `${d}:${e}`;

/** Call when a match starts (era is known): fetch the count + first batch. */
export async function warmup(
  difficulty: Difficulty,
  era: EraKey,
): Promise<void> {
  buffer = [];
  bufferKey = keyOf(difficulty, era);
  total = await fetchTotalSongs(difficulty, era); // the ONE count query
  await refill(difficulty, era);
}

function refill(difficulty: Difficulty, era: EraKey): Promise<void> {
  if (inflight) return inflight; // don't double-fetch
  const start = Math.floor(
    Math.random() * (Math.max(0, total - BATCH_SIZE) + 1),
  );
  inflight = fetchRandomSongs(start, BATCH_SIZE, difficulty, era)
    .then((songs) => {
      buffer.push(...songs);

      // Debug: inspect the batch we just pulled.
      console.log(
        `🎲 Retrieved ${songs.length} songs (offset ${start} of ${total})`,
      );
      console.log(
        "📅 Years:",
        songs.map((s) => s.year),
      );
      console.log(
        "🎤 Artists:",
        songs.map((s) => s.artist_name),
      );
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Remove and return `count` random, distinct songs from `arr` (mutates it). */
function takeRandom(arr: Song[], count: number): Song[] {
  const taken: Song[] = [];
  for (let i = 0; i < count && arr.length > 0; i++) {
    const idx = Math.floor(Math.random() * arr.length);
    taken.push(arr.splice(idx, 1)[0]);
  }
  return taken;
}

/** Take `count` RANDOM songs from the buffer, refilling only when low. */
export async function takeSongs(
  count: number,
  difficulty: Difficulty,
  era: EraKey,
): Promise<Song[]> {
  const key = keyOf(difficulty, era);
  if (key !== bufferKey) await warmup(difficulty, era); // filter changed → recount + refill
  if (buffer.length < count) await refill(difficulty, era);

  // Pick randomly from the retrieved batch instead of taking them in DB order
  // (consecutive rows are often the same artist/album).
  const taken = takeRandom(buffer, count);
  if (buffer.length < REFILL_AT) void refill(difficulty, era); // top up in background

  if (taken.length < count) {
    throw new Error("Not enough songs for this filter.");
  }
  return taken;
}
