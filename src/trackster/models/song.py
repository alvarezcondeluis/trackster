"""Song data model — represents a Spotify track from our database."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Song(BaseModel):
    """A single song from the Supabase songs table.

    This is what the frontend receives when it asks for a random song.
    The preview_url is a direct link to a 30-second MP3 from Spotify.
    The album_art_url is a direct link to the album cover image.
    """
    id: str                    # Spotify track ID
    name: str                  # Song title
    artist_name: str           # Artist(s) comma-separated
    artists: list[str] | None = None
    genres: list[str] | None = None
    year: int | None = None
    popularity: int | None = None
    preview_url: str | None = None      # Direct MP3 URL (30 seconds)
    album_art_url: str | None = None    # Album cover image URL
    album_name: str | None = None       # Album name

    model_config = ConfigDict(from_attributes=True)
