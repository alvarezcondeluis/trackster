"""API routes for the game."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import Song
from ..services.song_service import get_random_song, get_songs

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check() -> dict:
    """Simple health check. Used to verify the server is running."""
    return {"status": "ok"}


@router.get("/spotify/test")
def test_spotify_token(token: str) -> dict:
    """Test a Spotify access token by calling the /me endpoint.

    This verifies that the token is valid and can be used for playback.
    """
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
            return {
                "valid": False,
                "message": "Token is invalid or expired",
            }
        else:
            return {
                "valid": False,
                "message": f"Unexpected status code: {response.status_code}",
            }

    except Exception as e:
        return {
            "valid": False,
            "message": f"Error testing token: {str(e)}",
        }


@router.get("/songs/random", response_model=Song)
def random_song(
    difficulty: str = "medium",
    fetch_preview: bool = True,
    era: str = "all",
) -> Song:
    """Get a random song for the game.

    Query params:
        difficulty: "easy" | "medium" | "hard"
        fetch_preview: true (SDK mode - fetch from Spotify) | false (URI mode - skip API calls)
        era: time period to draw from, e.g. "all" | "2000s" | "80s" | "last5"

    Returns:
        A Song object. If fetch_preview=true, includes preview_url.
                       If fetch_preview=false, preview_url is None.

    Examples:
        GET /api/songs/random?difficulty=medium&fetch_preview=true
        GET /api/songs/random?difficulty=easy&era=80s
    """
    try:
        song = get_random_song(difficulty, fetch_preview=fetch_preview, era=era)
        return song
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch database errors, network issues, etc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch song: {str(e)}"
        )


@router.get("/songs/batch", response_model=list[Song])
def random_songs(
    count: int = 1,
    difficulty: str = "medium",
    fetch_preview: bool = True,
    era: str = "all",
) -> list[Song]:
    """Get `count` random songs for the game.

    count == 1 returns a single-song list (robust preview retry preserved);
    count > 1 returns that many distinct songs (used by Higher or Lower).

    Example:
        GET /api/songs/batch?count=2&difficulty=medium&era=2000s
    """
    if count < 1 or count > 10:
        raise HTTPException(status_code=400, detail="count must be between 1 and 10")
    try:
        return get_songs(count, difficulty, fetch_preview=fetch_preview, era=era)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch songs: {str(e)}")
