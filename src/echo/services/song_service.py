"""Song service — queries the songs table with filtering.

Selection strategy: the frontend caches the match's song count once, rolls a
random offset, and fetches a small window (see get_songs_sample). Album art is
cache-only in batches and fetched lazily per song on play (see get_song_art).
"""

from __future__ import annotations

import random
from datetime import datetime

from ..db import supabase
from ..models import Song
from .spotify import (
    cache_album_art_to_supabase,
    get_track_album_art,
)

# Popularity thresholds for difficulty levels.
# Idea: easier songs are more popular (people know them).
DIFFICULTY_THRESHOLDS = {
    "easy": 75,  # Very popular songs (Billie Eilish, The Weeknd)
    "medium": 40,  # Moderately known (indie, some classics)
    "hard": 0,  # Anything goes (deep cuts, obscure)
}

# Current year, computed once at import. "Rolling" eras (last 5 years) are
# defined relative to this so they stay correct over time.
_CURRENT_YEAR = datetime.now().year

# Era → inclusive (year_min, year_max) range. None means "unbounded on that side".
ERA_RANGES: dict[str, tuple[int | None, int | None]] = {
    "all": (None, None),
    "last5": (_CURRENT_YEAR - 4, None),
    "2020s": (2020, 2029),
    "2010s": (2010, 2019),
    "2000s": (2000, 2009),
    "2000plus": (2000, None),
    "90s": (1990, 1999),
    "80s": (1980, 1989),
    "70s": (1970, 1979),
}


# ---------------------------------------------------------------------------
# Query helpers + windowed fetch
# ---------------------------------------------------------------------------


def _apply_filters(query, difficulty: str, era: str):
    """Chain difficulty (popularity), era (year range) and not-banned filters.

    Takes a Supabase query and returns it with the filters applied, so the count
    and the windowed read share exactly the same predicate.

    Raises:
        ValueError: if difficulty is invalid.
    """
    if difficulty not in DIFFICULTY_THRESHOLDS:
        raise ValueError(
            f"difficulty must be one of {list(DIFFICULTY_THRESHOLDS.keys())}"
        )

    min_popularity = DIFFICULTY_THRESHOLDS[difficulty]
    year_min, year_max = ERA_RANGES.get(era, ERA_RANGES["all"])

    query = query.gte("popularity", min_popularity).gt("rating_score", 1)
    if year_min is not None:
        query = query.gte("year", year_min)
    if year_max is not None:
        query = query.lte("year", year_max)
    return query


def count_songs(difficulty: str = "medium", era: str = "all") -> int:
    """Count matching songs (HEAD request — no rows). Called once per match."""
    q = _apply_filters(
        supabase.table("songs").select("id", count="exact", head=True),
        difficulty,
        era,
    )
    return q.execute().count or 0


def _attach_cached_art(song_data: dict) -> None:
    """Cheap: use the Supabase-cached art URL if present; never hit Spotify here.

    Used for batches so 50 songs don't trigger 50 Spotify calls. Songs without a
    cached image get their art lazily (get_song_art) when they're actually played.
    """
    if song_data.get("album_art_cached_url"):
        song_data["album_art_url"] = song_data["album_art_cached_url"]


def get_songs_sample(
    offset: int, count: int, difficulty: str = "medium", era: str = "all"
) -> list[Song]:
    """Return `count` rows from a window starting at `offset` (caller picks it).

    Album art is cache-only here (lazy on play), keeping batch fetches light.
    """
    # The table's physical order is clustered by year, so a contiguous .range()
    # window would return one single year. Ordering by `id` first fixes that:
    # Spotify IDs are random base-62 strings, so id-order is a stable random
    # permutation — a contiguous window of it mixes years/artists uniformly.
    rows = (
        _apply_filters(supabase.table("songs").select("*"), difficulty, era)
        .order("id")
        .range(offset, offset + count - 1)
        .execute()
        .data
    )
    random.shuffle(rows)  # also shuffle the window so within-batch order isn't stable
    songs: list[Song] = []
    for s in rows:
        _attach_cached_art(s)
        songs.append(Song(**s))
    return songs


def get_songs(
    count: int = 1, difficulty: str = "medium", era: str = "all"
) -> list[Song]:
    """Standalone helper: fetch `count` random songs, rolling the offset here.

    The frontend normally caches the count and calls get_songs_sample directly;
    this is the fallback so the batch endpoint works without a client-side offset.
    """
    total = count_songs(difficulty, era)
    if total == 0:
        raise ValueError(f"No songs for difficulty '{difficulty}' + era '{era}'.")
    count = min(count, total)
    offset = random.randint(0, total - count)
    return get_songs_sample(offset, count, difficulty, era)


# ---------------------------------------------------------------------------
# Album art
# ---------------------------------------------------------------------------


def _attach_album_art(song_data: dict, debug: bool = False) -> None:
    """Populate album_art_url via the Supabase cache, else Spotify + upload.

    Heavier than _attach_cached_art (may hit Spotify), so it's used for ONE song
    at a time (lazy, on play) — never for a whole batch. Mutates in place.
    """
    if song_data.get("album_art_cached_url"):
        song_data["album_art_url"] = song_data["album_art_cached_url"]
        return

    album_art = get_track_album_art(song_data["id"], debug=debug)
    if not album_art:
        return

    song_data["album_name"] = album_art.get("album_name")
    song_data["album_art_url"] = album_art.get("album_art_url")

    if song_data.get("album_art_url"):
        cached_url = cache_album_art_to_supabase(
            track_id=song_data["id"],
            image_url=song_data["album_art_url"],
            album_name=song_data.get("album_name", "Unknown"),
            debug=debug,
        )
        if cached_url:
            song_data["album_art_url"] = cached_url


def get_song_art(song_id: str) -> dict:
    """Fetch (and cache) one song's album art on demand.

    Fast path: read the row's cached art first and return it if present, so an
    already-cached song never re-hits Spotify or re-uploads to Storage. Only on a
    miss do we fall back to Spotify (and cache the result). Both Spotify helpers
    swallow their own errors, so this never raises: worst case it returns a null
    URL and the UI shows the gradient fallback.
    """
    data: dict = {"id": song_id}

    # Cache check: pull the cached columns for this row (if any) before doing work.
    try:
        row = (
            supabase.table("songs")
            .select("album_art_cached_url")
            .eq("id", song_id)
            .limit(1)
            .execute()
        )
        if row.data:
            data.update(row.data[0])
    except Exception as e:
        print(f"Warning: could not read cached art for {song_id}: {e}")

    _attach_album_art(data)  # cache hit → returns early; miss → Spotify + cache
    return {
        "album_art_url": data.get("album_art_url"),
        "album_name": data.get("album_name"),
    }


# ---------------------------------------------------------------------------
# Rating — the player picks an absolute 1..5 score that biases future selection.
# 1 = banned (never chosen); 2..5 = selection weight; 3 = default for unrated.
# (1, not 0, is the ban value so scores stay inside the DB's 1..5 constraint.)
# ---------------------------------------------------------------------------

_DEFAULT_SCORE = 3
_MIN_SCORE = 1
_MAX_SCORE = 5


def weight_for(score: int) -> float:
    """Selection weight for a rating score. 1 or below → 0.0 (banned/excluded)."""
    return float(score) if score > 1 else 0.0


def _weighted_sample(pool: list[dict], k: int) -> list[dict]:
    """Return `k` distinct songs from `pool`, weighted by rating; banned excluded.

    A missing `rating_score` defaults to 3 (playable). Raises ValueError if there
    aren't `k` selectable candidates (all banned, or pool too small).
    """
    candidates = [
        s for s in pool if weight_for(s.get("rating_score", _DEFAULT_SCORE)) > 0
    ]
    if len(candidates) < k:
        raise ValueError(
            f"Not enough selectable songs (need {k}, have {len(candidates)} "
            f"after excluding banned)."
        )

    remaining = candidates[:]
    weights = [weight_for(s.get("rating_score", _DEFAULT_SCORE)) for s in remaining]
    chosen: list[dict] = []
    for _ in range(k):
        [idx] = random.choices(range(len(remaining)), weights=weights, k=1)
        chosen.append(remaining.pop(idx))
        weights.pop(idx)
    return chosen


def rate_song(song_id: str, score: int) -> int:
    """Set a song's rating to `score` (1..5) directly, persist it, and return it.

    The player picks an absolute value on the reveal screen: 1 bans the song
    from future selection, 2..5 are selection weights. Raises ValueError for an
    out-of-range score or a song that doesn't exist.
    """
    if not _MIN_SCORE <= score <= _MAX_SCORE:
        raise ValueError(f"rating must be {_MIN_SCORE}..{_MAX_SCORE}, got {score}")

    result = (
        supabase.table("songs")
        .update({"rating_score": score})
        .eq("id", song_id)
        .execute()
    )
    if not result.data:
        raise ValueError(f"Song not found: {song_id}")
    return score
