"""Song service — queries the songs table with filtering."""

from __future__ import annotations

import random
from datetime import datetime

from ..db import supabase
from ..models import Song
from .spotify import (
    cache_album_art_to_supabase,
    get_track_album_art,
    get_track_preview_url,
)

# Popularity thresholds for difficulty levels.
# Idea: easier songs are more popular (people know them).
DIFFICULTY_THRESHOLDS = {
    "easy": 70,      # Very popular songs (Billie Eilish, The Weeknd)
    "medium": 40,    # Moderately known (indie, some classics)
    "hard": 0,       # Anything goes (deep cuts, obscure)
}

# Current year, computed once at import. "Rolling" eras (last 5 years) are
# defined relative to this so they stay correct over time.
_CURRENT_YEAR = datetime.now().year

# Era → inclusive (year_min, year_max) range. None means "unbounded on that side".
# This is the single source of truth for what each era means. The frontend only
# sends the key (e.g. "2000s"); the backend decides the actual years.
ERA_RANGES: dict[str, tuple[int | None, int | None]] = {
    "all": (None, None),                       # no year filter
    "last5": (_CURRENT_YEAR - 4, None),        # last 5 calendar years incl. this one
    "2020s": (2020, 2029),
    "2010s": (2010, 2019),
    "2000s": (2000, 2009),
    "2000plus": (2000, None),                  # "from 2000 to now"
    "90s": (1990, 1999),
    "80s": (1980, 1989),
    "70s": (1970, 1979),
}


def get_random_song(
    difficulty: str = "medium",
    fetch_preview: bool = True,
    era: str = "all",
    max_attempts: int = 5,
    debug: bool = False,
) -> Song:
    """Fetch a random song from Supabase, filtered by difficulty and era.

    If preview_url is not in database, fetches from Spotify API.
    Retries until finding a song WITH preview URL (if fetch_preview=True).

    Args:
        difficulty: "easy", "medium", or "hard"
        fetch_preview: If True, keep retrying until finding a song with preview URL.
                      If False, accept songs without preview.
        era: Which time period to draw from (key of ERA_RANGES, e.g. "2000s").
             Unknown values fall back to "all" (no year filter).
        max_attempts: Max retries to find a song with preview URL (only used if fetch_preview=True)
        debug: Enable debug logging

    Returns:
        A Song object with data from Supabase (preview_url populated from Spotify if needed).

    Raises:
        ValueError: if difficulty is invalid, no songs found, or can't find song with preview after max_attempts.
    """
    if difficulty not in DIFFICULTY_THRESHOLDS:
        raise ValueError(
            f"difficulty must be one of {list(DIFFICULTY_THRESHOLDS.keys())}"
        )

    # Draw a candidate pool matching difficulty + era (shared query builder).
    pool = _query_pool(difficulty, era)

    attempts = 0
    while attempts < max_attempts:
        attempts += 1

        # Prefer songs with preview URLs already in database
        songs_with_preview = [s for s in pool if s.get("preview_url")]
        if songs_with_preview:
            song_data = random.choice(songs_with_preview)
            print(f"✅ Found song with preview in database")
        else:
            # No songs with preview in batch, pick random and try to fetch
            song_data = random.choice(pool)

        # Only look up a preview when the caller needs one (preview / hidden-audio
        # mode). SDK "Full Song" mode plays by track ID, so we skip this entirely
        # and return a random song immediately — no Spotify calls, no retries.
        if fetch_preview:
            if not song_data.get("preview_url"):
                print(f"🔍 Fetching preview URL for track: {song_data['id']} (attempt {attempts}/{max_attempts})")
                preview_url = get_track_preview_url(song_data["id"], debug=debug)
                if preview_url:
                    song_data["preview_url"] = preview_url
                    print(f"✅ Preview URL fetched: {preview_url[:80]}...")
                else:
                    print(f"⚠️ No preview available for {song_data.get('name', 'Unknown')}")
                    if attempts < max_attempts:
                        print(f"🔄 Retrying to find another song with preview... ({attempts}/{max_attempts})")
                        continue
            else:
                print(f"✅ Preview URL found in database")

        # Done when we have a preview, or when we don't need one (SDK mode).
        if song_data.get("preview_url") or not fetch_preview:
            break

    if debug:
        has_preview = "✅" if song_data.get("preview_url") else "❌"
        print(f"{has_preview} {song_data.get('name', 'Unknown')} by {song_data.get('artist_name', 'Unknown')}")

    _attach_album_art(song_data, debug=debug)
    return Song(**song_data)


# ---------------------------------------------------------------------------
# Shared helpers + multi-song fetch (used by modes that need >1 song per round)
# ---------------------------------------------------------------------------


def _query_pool(difficulty: str, era: str) -> list[dict]:
    """Return a candidate pool of songs matching difficulty + era.

    Single source of truth for the pool query — reused by both the single-song
    and multi-song fetchers.

    Raises:
        ValueError: if difficulty is invalid or the pool is empty.
    """
    if difficulty not in DIFFICULTY_THRESHOLDS:
        raise ValueError(
            f"difficulty must be one of {list(DIFFICULTY_THRESHOLDS.keys())}"
        )

    min_popularity = DIFFICULTY_THRESHOLDS[difficulty]
    year_min, year_max = ERA_RANGES.get(era, ERA_RANGES["all"])

    query = supabase.table("songs").select("*").gte("popularity", min_popularity)
    if year_min is not None:
        query = query.gte("year", year_min)
    if year_max is not None:
        query = query.lte("year", year_max)
    response = query.limit(1000).execute()

    if not response.data:
        raise ValueError(
            f"No songs found for difficulty '{difficulty}' + era '{era}'. "
            f"Try a lower difficulty or a wider era."
        )
    return response.data


def _attach_album_art(song_data: dict, debug: bool = False) -> None:
    """Populate album_art_url on song_data, using the Supabase cache when possible.

    Mutates song_data in place.
    """
    if song_data.get("album_art_cached_url"):
        print("✅ Using previously cached image from Supabase")
        song_data["album_art_url"] = song_data["album_art_cached_url"]
        return

    album_art = get_track_album_art(song_data["id"], debug=debug)
    if not album_art:
        return

    song_data["album_name"] = album_art.get("album_name")
    song_data["album_art_url"] = album_art.get("album_art_url")

    if song_data.get("album_art_url"):
        print("💾 Caching album art to Supabase...")
        cached_url = cache_album_art_to_supabase(
            track_id=song_data["id"],
            image_url=song_data["album_art_url"],
            album_name=song_data.get("album_name", "Unknown"),
            debug=debug,
        )
        if cached_url:
            song_data["album_art_url"] = cached_url
            print("✅ Image cached to Supabase")
        else:
            print("⚠️ Caching failed, using Spotify URL")


def get_random_songs(
    count: int,
    difficulty: str = "medium",
    fetch_preview: bool = True,
    era: str = "all",
    debug: bool = False,
) -> list[Song]:
    """Fetch `count` DISTINCT random songs (best-effort preview per song).

    Used by modes that need more than one song per round (e.g. Higher or Lower).
    Unlike get_random_song, this does NOT aggressively retry for previews — it
    picks distinct songs and attaches a preview only if readily available.
    """
    pool = _query_pool(difficulty, era)
    if len(pool) < count:
        raise ValueError(
            f"Not enough songs for difficulty '{difficulty}' + era '{era}' "
            f"(need {count}, found {len(pool)}). Widen the filters."
        )

    chosen = random.sample(pool, count)
    songs: list[Song] = []
    for song_data in chosen:
        if fetch_preview and not song_data.get("preview_url"):
            preview_url = get_track_preview_url(song_data["id"], debug=debug)
            if preview_url:
                song_data["preview_url"] = preview_url
        _attach_album_art(song_data, debug=debug)
        songs.append(Song(**song_data))
    return songs


def get_songs(
    count: int = 1,
    difficulty: str = "medium",
    fetch_preview: bool = True,
    era: str = "all",
    debug: bool = False,
) -> list[Song]:
    """Uniform entry point for the game: return a list of `count` songs.

    count == 1 delegates to get_random_song (keeps its robust preview retry);
    count > 1 uses get_random_songs (distinct, best-effort previews).
    """
    if count <= 1:
        return [get_random_song(difficulty, fetch_preview=fetch_preview, era=era, debug=debug)]
    return get_random_songs(count, difficulty, fetch_preview=fetch_preview, era=era, debug=debug)
