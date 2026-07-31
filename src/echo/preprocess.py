"""Clean the raw Kaggle CSVs into a tidy dataset ready for the database.

The raw ``tracks.csv`` stores some fields awkwardly for our purposes:
  * ``artists``   -> a stringified Python list, e.g. "['Daft Punk', 'Pharrell']"
  * ``id_artists``-> same, list of artist ids
  * ``release_date`` -> mixed "YYYY" and "YYYY-MM-DD" formats

This module normalises those, derives a ``year`` and ``decade`` (useful game
categories), optionally attaches genres from ``artists.csv``, drops unusable
rows, and writes a single Parquet file to ``data/processed``.

Usage:
    uv run python -m echo.preprocess
"""

import ast
import sys
import pandas as pd

from .config import PROCESSED_DIR, RAW_DIR, ensure_dirs

OUTPUT_PATH = PROCESSED_DIR / "tracks_clean.parquet"


def _parse_list(value) -> list[str]:
    """Turn a stringified list column into a real list; be forgiving on junk."""
    if isinstance(value, list):
        return value
    if not isinstance(value, str) or not value.strip():
        return []
    try:
        parsed = ast.literal_eval(value)
        return list(parsed) if isinstance(parsed, (list, tuple)) else [str(parsed)]
    except (ValueError, SyntaxError):
        return [value]


def _load_tracks() -> pd.DataFrame:
    path = RAW_DIR / "tracks.csv"
    if not path.exists():
        sys.exit(
            f"{path} not found. Run `uv run python -m echo.download` first."
        )
    print(f"Loading {path.name} ...")
    return pd.read_csv(path)


def _load_artist_genres() -> dict[str, list[str]]:
    """Map artist_id -> list of genres from artists.csv (if available)."""
    path = RAW_DIR / "artists.csv"
    if not path.exists():
        print("artists.csv not found; skipping genre enrichment.")
        return {}
    print(f"Loading {path.name} for genres ...")
    artists = pd.read_csv(path, usecols=["id", "genres"])
    artists["genres"] = artists["genres"].map(_parse_list)
    return dict(zip(artists["id"], artists["genres"]))


def preprocess() -> pd.DataFrame:
    ensure_dirs()
    df = _load_tracks()

    # Normalise artist columns.
    df["artists"] = df["artists"].map(_parse_list)
    if "id_artists" in df.columns:
        df["id_artists"] = df["id_artists"].map(_parse_list)
    df["artist_name"] = df["artists"].map(lambda a: ", ".join(a) if a else None)

    # Derive year / decade from release_date.
    year = pd.to_datetime(df["release_date"], errors="coerce").dt.year
    # Fall back to a plain 4-digit year when the date failed to parse.
    year = year.fillna(pd.to_numeric(df["release_date"].astype(str).str[:4], errors="coerce"))
    df["year"] = year.astype("Int64")
    df["decade"] = (df["year"] // 10 * 10).astype("Int64")

    # Attach all genres from all credited artists.
    genre_map = _load_artist_genres()
    if genre_map and "id_artists" in df.columns:
        def all_genres(ids: list[str]) -> list[str]:
            genres_set = set()
            for aid in ids:
                genres = genre_map.get(aid)
                if genres:
                    genres_set.update(genres)
            return sorted(list(genres_set))
        df["genres"] = df["id_artists"].map(all_genres)

    # Drop rows we can never use in the game.
    before = len(df)
    df = df.dropna(subset=["name", "artist_name", "year"])
    df = df[df["name"].str.strip().astype(bool)]
    df = df.drop_duplicates(subset=["id"]) if "id" in df.columns else df.drop_duplicates()
    print(f"Dropped {before - len(df):,} unusable/duplicate rows -> {len(df):,} kept.")

    # Keep a focused set of columns for the database.
    keep = [c for c in [
        "id", "name", "artist_name", "artists", "id_artists",
        "year", "decade", "genres", "popularity", "duration_ms", "explicit",
    ] if c in df.columns]
    df = df[keep].reset_index(drop=True)

    df.to_parquet(OUTPUT_PATH, index=False)
    print(f"Wrote {len(df):,} rows to {OUTPUT_PATH}")
    return df


if __name__ == "__main__":
    preprocess()
