"""API routes for the game."""

from __future__ import annotations

import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models import Song
from ..services.song_service import (
    count_songs,
    get_song_art,
    get_songs_sample,
    rate_song,
)

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check() -> dict:
    """Simple health check. Used to verify the server is running."""
    return {"status": "ok"}


@router.get("/spotify/test")
def test_spotify_token(token: str) -> dict:
    """Test a Spotify access token by calling the /me endpoint."""
    try:
        import httpx

        response = httpx.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

        if response.status_code == 200:
            user_data = response.json()
            return {
                "valid": True,
                "user": {
                    "id": user_data.get("id"),
                    "display_name": user_data.get("display_name"),
                    "email": user_data.get("email"),
                },
                "message": "Token is valid!",
            }
        elif response.status_code == 401:
            return {"valid": False, "message": "Token is invalid or expired"}
        else:
            return {
                "valid": False,
                "message": f"Unexpected status code: {response.status_code}",
            }

    except Exception as e:
        return {"valid": False, "message": f"Error testing token: {str(e)}"}


@router.get("/songs/count")
def songs_count(difficulty: str = "medium", era: str = "all") -> int:
    """Total songs matching the filters. The frontend caches this once per match."""
    try:
        return count_songs(difficulty, era)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/songs/batch", response_model=list[Song])
def songs_batch(
    count: int = 1,
    offset: int | None = None,
    difficulty: str = "medium",
    era: str = "all",
) -> list[Song]:
    """Return `count` songs from a random window.

    The frontend supplies `offset` (rolled against the cached count). If omitted,
    we compute a random one here so the endpoint still works standalone.

    Example:
        GET /api/songs/batch?offset=120&count=50&difficulty=medium&era=2000s
    """
    try:
        if offset is None:
            total = count_songs(difficulty, era)
            offset = random.randint(0, max(0, total - count))
        return get_songs_sample(offset, count, difficulty, era)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/songs/{song_id}/art")
def song_art(song_id: str) -> dict:
    """Fetch (and cache) one song's album art on demand — lazy, on play."""
    try:
        return get_song_art(song_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch art: {e}") from e


class RateRequest(BaseModel):
    """Body for the rate endpoint: the player's chosen 0..5 score (0 = ban)."""

    score: int


@router.post("/songs/{song_id}/rate")
def song_rate(song_id: str, body: RateRequest) -> dict:
    """Set a song's rating to a chosen 0..5 score and return the new value.

    Example:
        POST /api/songs/6fuj.../rate   {"score": 5}  → {"rating_score": 5}
    """
    try:
        return {"rating_score": rate_song(song_id, body.score)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        # e.g. a DB check-constraint violation — surface it as a handled response
        # (an unhandled 500 bypasses CORS, showing a misleading CORS error).
        raise HTTPException(
            status_code=502, detail=f"Failed to save rating: {e}"
        ) from e
