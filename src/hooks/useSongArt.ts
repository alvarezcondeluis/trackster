/**
 * Lazy album-art hook.
 * Batches return songs with cached art only (cheap). When a song is displayed
 * without art, this fetches it on demand (which also caches it to Supabase, so
 * it's instant next time). Returns the art URL to render.
 */

import { useEffect, useState } from "react";
import { fetchSongArt } from "@/services/api";
import type { Song } from "@/types/game";

export function useSongArt(song: Song | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(
    song?.album_art_url ?? undefined,
  );

  useEffect(() => {
    if (!song) return;
    if (song.album_art_url) {
      setUrl(song.album_art_url); // already have it (cache hit from the batch)
      return;
    }

    let cancelled = false;
    setUrl(undefined);
    fetchSongArt(song.id)
      .then((art) => {
        if (!cancelled) setUrl(art.album_art_url ?? undefined);
      })
      .catch(() => {
        /* leave undefined → the gradient fallback shows */
      });
    return () => {
      cancelled = true;
    };
  }, [song?.id, song?.album_art_url]);

  return url;
}
