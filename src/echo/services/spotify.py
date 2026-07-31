"""Spotify API integration for fetching preview URLs and metadata."""

from __future__ import annotations

import base64
import io
import sys
import time
from datetime import datetime

import httpx

from ..config import getenv
from ..db import supabase

# Simple rate limiter: track when we last made a request
_last_request_time: datetime | None = None
_min_request_interval = 0.5  # seconds between requests

# Cache for avoiding re-fetches
_preview_cache: dict[str, str | None] = {}
_album_art_cache: dict[str, dict | None] = {}


def get_spotify_access_token() -> str:
    """Get a Spotify API access token using Client Credentials flow.

    Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env

    Returns:
        Access token string.

    Raises:
        ValueError: if credentials missing or API call fails.
    """
    client_id = getenv("SPOTIFY_CLIENT_ID")
    client_secret = getenv("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise ValueError(
            "Spotify credentials missing.\n"
            "  Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env\n"
            "  Get them from: https://developer.spotify.com/dashboard"
        )

    # Base64 encode credentials for HTTP Basic Auth
    credentials = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    response = httpx.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {credentials}"},
        data={"grant_type": "client_credentials"},
        timeout=10,
    )

    if response.status_code != 200:
        raise ValueError(
            f"Spotify auth failed: {response.status_code} {response.text}"
        )

    return response.json()["access_token"]


# Cache the token so we don't request it every time
_cached_token: str | None = None


def _get_cached_token() -> str:
    """Get cached token or fetch a new one."""
    global _cached_token
    if _cached_token is None:
        _cached_token = get_spotify_access_token()
    return _cached_token


def _enforce_rate_limit() -> None:
    """Wait if needed to respect Spotify rate limits.

    Ensures we don't make more than one request per _min_request_interval.
    """
    global _last_request_time

    if _last_request_time is not None:
        elapsed = (datetime.now() - _last_request_time).total_seconds()
        if elapsed < _min_request_interval:
            wait_time = _min_request_interval - elapsed
            time.sleep(wait_time)

    _last_request_time = datetime.now()


def get_track_preview_url(track_id: str, retry_count: int = 0, debug: bool = False) -> str | None:
    """Fetch preview URL for a track from Spotify API.

    Caches results to avoid re-fetching. Enforces rate limiting based on Spotify's
    Retry-After header.
    See: https://developer.spotify.com/documentation/web-api/guides/rate-limits

    Args:
        track_id: Spotify track ID (e.g., "35iwgR4jXetI318WEWsa1Q")
        retry_count: Internal — tracks retries
        debug: If True, print detailed API response info

    Returns:
        Preview URL (HTTPS link to 30-second MP3) or None if unavailable.
    """
    # Check cache first
    if track_id in _preview_cache:
        if debug:
            print(f"[DEBUG] Cache hit for {track_id}")
        return _preview_cache[track_id]

    try:
        # Enforce rate limiting BEFORE making the request
        _enforce_rate_limit()

        token = _get_cached_token()

        if debug:
            print(f"\n[DEBUG] Fetching track: {track_id}")

        response = httpx.get(
            f"https://api.spotify.com/v1/tracks/{track_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

        if debug:
            print(f"[DEBUG] Status code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            if debug:
                print(f"[DEBUG] Response keys: {data.keys()}")
                print(f"[DEBUG] Track name: {data.get('name', 'N/A')}")
                print(f"[DEBUG] preview_url present: {'preview_url' in data}")
                print(f"[DEBUG] preview_url value: {data.get('preview_url', 'None')}")

            preview_url = data.get("preview_url")

            # Cache the result (even if None)
            _preview_cache[track_id] = preview_url

            if debug:
                if preview_url:
                    print(f"[DEBUG] ✅ Found preview URL: {preview_url[:80]}...")
                else:
                    print(f"[DEBUG] ❌ No preview URL available for this track")

            return preview_url

        # Handle rate limiting (429) — respect Retry-After header
        if response.status_code == 429 and retry_count < 1:
            # Get the Retry-After header from Spotify (tells us how long to wait)
            retry_after = response.headers.get("Retry-After", "1")
            try:
                wait_time = int(retry_after)
            except ValueError:
                wait_time = 1  # Default to 1 second if header is invalid

            if debug:
                print(f"[DEBUG] Rate limited (429). Spotify says wait {wait_time}s...")
            else:
                print(f"Rate limited. Waiting {wait_time}s (per Spotify Retry-After header)...")

            time.sleep(wait_time)
            return get_track_preview_url(track_id, retry_count + 1, debug)

        if debug:
            print(f"[DEBUG] ❌ Unexpected status code: {response.status_code}")
            print(f"[DEBUG] Response: {response.text[:200]}")

        return None

    except Exception as e:
        if debug:
            print(f"[DEBUG] ❌ Exception: {e}")
        else:
            print(f"Warning: failed to fetch preview for {track_id}: {e}")
        return None


def get_track_album_art(track_id: str, debug: bool = False) -> dict | None:
    """Fetch album art and metadata for a track from Spotify API.

    Returns album name and cover image URL.

    Args:
        track_id: Spotify track ID
        debug: If True, print detailed info

    Returns:
        Dict with 'album_name' and 'album_art_url' keys, or None if unavailable.
    """
    # Check cache first
    if track_id in _album_art_cache:
        return _album_art_cache[track_id]

    try:
        # Enforce rate limiting
        _enforce_rate_limit()

        token = _get_cached_token()

        if debug:
            print(f"[DEBUG] Fetching album art for: {track_id}")

        response = httpx.get(
            f"https://api.spotify.com/v1/tracks/{track_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

        if response.status_code == 200:
            data = response.json()
            album = data.get("album", {})

            # Get the largest album cover image
            images = album.get("images", [])
            album_art_url = None
            if images:
                # Images are sorted by size (largest first)
                album_art_url = images[0].get("url")

            result = {
                "album_name": album.get("name", "Unknown Album"),
                "album_art_url": album_art_url,
            }

            # Cache the result
            _album_art_cache[track_id] = result

            if debug:
                print(f"[DEBUG] ✅ Album: {result['album_name']}")
                print(f"[DEBUG] Cover: {album_art_url[:80] if album_art_url else 'None'}...")

            return result

        if debug:
            print(f"[DEBUG] ❌ Status {response.status_code}")

        return None

    except Exception as e:
        if debug:
            print(f"[DEBUG] ❌ Exception: {e}")
        return None


def cache_album_art_to_supabase(
    track_id: str, image_url: str, album_name: str = "Unknown", debug: bool = False
) -> str | None:
    """Download album art from Spotify and cache to Supabase Storage.

    Returns the Supabase public URL for the cached image.

    Args:
        track_id: Spotify track ID
        image_url: Image URL from Spotify API
        album_name: Album name (for metadata)
        debug: If True, print debug info

    Returns:
        Public URL to cached image on Supabase, or None if failed.
    """
    if not image_url:
        return None

    try:
        if debug:
            print(f"📥 Downloading album art for {track_id}...")

        # Download image from Spotify
        response = httpx.get(image_url, timeout=10)
        if response.status_code != 200:
            if debug:
                print(f"❌ Failed to download image: {response.status_code}")
            return None

        image_data = response.content
        if debug:
            print(f"✅ Downloaded {len(image_data)} bytes")

        # Upload to Supabase Storage
        if debug:
            print(f"📤 Uploading to Supabase Storage...")

        file_name = f"{track_id}.jpg"
        path = f"album-art/{file_name}"

        # Upload the file
        supabase.storage.from_("album-art").upload(
            path=path,
            file=image_data,
            file_options={"content-type": "image/jpeg"},
        )

        if debug:
            print(f"✅ Uploaded to Supabase Storage: {path}")

        # Get public URL
        public_url = supabase.storage.from_("album-art").get_public_url(path)

        if debug:
            print(f"🔗 Public URL: {public_url}")

        # Update songs table with cached URL
        try:
            supabase.table("songs").update(
                {
                    "album_art_cached_url": public_url,
                    "album_art_cached_at": datetime.now().isoformat(),
                }
            ).eq("id", track_id).execute()

            if debug:
                print(f"✅ Updated songs table with cached URL")
        except Exception as update_error:
            if debug:
                print(f"⚠️ Could not update songs table: {update_error}")
            # Continue anyway - we have the URL even if DB update fails

        return public_url

    except Exception as e:
        if debug:
            print(f"❌ Error caching album art: {e}")
        else:
            print(f"Warning: failed to cache album art for {track_id}: {e}")
        return None
