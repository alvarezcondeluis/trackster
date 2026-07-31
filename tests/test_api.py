"""Test the API endpoints."""

from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from echo.api.main import app


@pytest.fixture
def mock_spotify():
    """Mock the Spotify API so we don't make real calls."""
    def mock_preview(track_id, **kwargs):
        # Return a fake preview URL for any track ID
        return f"https://p.scdn.co/mp3-preview/fake-{track_id}"

    with patch("echo.services.spotify.get_track_preview_url", side_effect=mock_preview):
        yield


@pytest.fixture
def client(mock_spotify):
    """Create a test client with mocked Spotify API."""
    return TestClient(app)


class TestHealth:
    """Health check endpoint tests."""

    def test_health_check(self, client):
        """Verify the server is alive."""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestSongRetrieval:
    """Test basic song data retrieval from Supabase."""

    def test_random_song_returns_200(self, client):
        """Song endpoint should return HTTP 200."""
        response = client.get("/api/songs/random")
        assert response.status_code == 200

    def test_song_response_has_required_fields(self, client):
        """Song response must have all critical fields."""
        response = client.get("/api/songs/random")
        song = response.json()

        # Core fields that the game needs
        required_fields = ["id", "name", "artist_name", "preview_url"]
        for field in required_fields:
            assert field in song, f"Missing required field: {field}"
            assert song[field] is not None, f"Field {field} is null"

    def test_song_name_not_empty(self, client):
        """Song names should be non-empty strings."""
        response = client.get("/api/songs/random")
        song = response.json()

        assert isinstance(song["name"], str)
        assert len(song["name"]) > 0
        assert song["name"].strip() != ""

    def test_song_artist_name_not_empty(self, client):
        """Artist names should be non-empty strings."""
        response = client.get("/api/songs/random")
        song = response.json()

        assert isinstance(song["artist_name"], str)
        assert len(song["artist_name"]) > 0

    def test_preview_url_is_valid(self, client):
        """Preview URLs should be valid Spotify MP3 links."""
        response = client.get("/api/songs/random")
        song = response.json()

        preview_url = song["preview_url"]
        assert isinstance(preview_url, str)
        assert preview_url.startswith("https://")
        assert ".mp3" in preview_url or "preview" in preview_url

    def test_song_id_is_valid_spotify_id(self, client):
        """Spotify IDs should be non-empty strings."""
        response = client.get("/api/songs/random")
        song = response.json()

        assert isinstance(song["id"], str)
        assert len(song["id"]) > 0

    def test_song_year_when_present(self, client):
        """If year is present, it should be reasonable."""
        response = client.get("/api/songs/random")
        song = response.json()

        if song.get("year") is not None:
            year = song["year"]
            assert isinstance(year, int)
            assert 1920 <= year <= 2030  # Reasonable range

    def test_popularity_when_present(self, client):
        """If popularity is present, it should be 0-100."""
        response = client.get("/api/songs/random")
        song = response.json()

        if song.get("popularity") is not None:
            popularity = song["popularity"]
            assert isinstance(popularity, int)
            assert 0 <= popularity <= 100

    def test_genres_is_list_or_none(self, client):
        """Genres should be a list or None."""
        response = client.get("/api/songs/random")
        song = response.json()

        genres = song.get("genres")
        assert genres is None or isinstance(genres, list)
        if isinstance(genres, list):
            assert all(isinstance(g, str) for g in genres)

    def test_artists_is_list_or_none(self, client):
        """Artists should be a list or None."""
        response = client.get("/api/songs/random")
        song = response.json()

        artists = song.get("artists")
        assert artists is None or isinstance(artists, list)
        if isinstance(artists, list):
            assert all(isinstance(a, str) for a in artists)


class TestMultipleSongCalls:
    """Test randomness and consistency across multiple calls."""

    def test_multiple_calls_return_different_songs(self, client):
        """Calling the endpoint multiple times should return different songs."""
        song_ids = set()
        for _ in range(5):
            response = client.get("/api/songs/random")
            song_id = response.json()["id"]
            song_ids.add(song_id)

        # We should get at least 3 different songs in 5 calls
        # (some repeats are OK due to randomness)
        assert len(song_ids) >= 3, f"Got only {len(song_ids)} unique songs in 5 calls"

    def test_each_call_is_valid(self, client):
        """Every call should return a valid song."""
        for i in range(5):
            response = client.get("/api/songs/random")
            assert response.status_code == 200, f"Call {i+1} returned {response.status_code}"

            song = response.json()
            assert song["name"], f"Call {i+1} returned empty name"
            assert song["artist_name"], f"Call {i+1} returned empty artist"
            assert song["preview_url"], f"Call {i+1} returned no preview_url"


class TestDifficultyFiltering:
    """Test difficulty-based filtering."""

    def test_default_difficulty_is_medium(self, client):
        """Default call should use medium difficulty (>= 40 popularity)."""
        response = client.get("/api/songs/random")
        assert response.status_code == 200
        song = response.json()

        # Medium difficulty = >= 40 popularity
        if song.get("popularity") is not None:
            assert song["popularity"] >= 40

    def test_easy_difficulty_filter(self, client):
        """Easy songs should have high popularity (>= 70)."""
        response = client.get("/api/songs/random?difficulty=easy")
        assert response.status_code == 200
        song = response.json()

        if song.get("popularity") is not None:
            assert song["popularity"] >= 70, \
                f"Easy song has popularity {song['popularity']}, expected >= 70"

    def test_medium_difficulty_filter(self, client):
        """Medium songs should have popularity >= 40."""
        response = client.get("/api/songs/random?difficulty=medium")
        assert response.status_code == 200
        song = response.json()

        if song.get("popularity") is not None:
            assert song["popularity"] >= 40, \
                f"Medium song has popularity {song['popularity']}, expected >= 40"

    def test_hard_difficulty_no_filter(self, client):
        """Hard songs can have any popularity."""
        response = client.get("/api/songs/random?difficulty=hard")
        assert response.status_code == 200
        assert "name" in response.json()


class TestErrorHandling:
    """Test error cases and edge cases."""

    def test_invalid_difficulty_returns_400(self, client):
        """Unknown difficulty should return HTTP 400."""
        response = client.get("/api/songs/random?difficulty=invalid_difficulty")
        assert response.status_code == 400

        error_data = response.json()
        assert "detail" in error_data

    def test_empty_difficulty_uses_default(self, client):
        """Calling without difficulty param should work (use default)."""
        response = client.get("/api/songs/random")
        assert response.status_code == 200

    def test_case_insensitive_difficulty(self, client):
        """Test if difficulty param is case-sensitive (currently case-sensitive)."""
        # This test documents current behavior; adjust if needed
        response = client.get("/api/songs/random?difficulty=EASY")
        # Should fail since we're case-sensitive
        assert response.status_code == 400


class TestResponseConsistency:
    """Test that the response format is consistent."""

    def test_response_is_valid_json(self, client):
        """Response should be valid JSON."""
        response = client.get("/api/songs/random")
        # If this line runs, JSON is valid (would crash otherwise)
        song = response.json()
        assert isinstance(song, dict)

    def test_no_unexpected_null_fields(self, client):
        """Critical fields should never be null."""
        response = client.get("/api/songs/random")
        song = response.json()

        # These should always have values
        assert song["id"] is not None
        assert song["name"] is not None
        assert song["artist_name"] is not None
        assert song["preview_url"] is not None

    def test_response_has_no_extra_debug_fields(self, client):
        """Response should only have expected fields."""
        response = client.get("/api/songs/random")
        song = response.json()

        expected_fields = {
            "id", "name", "artist_name", "artists", "genres",
            "year", "popularity", "preview_url"
        }
        actual_fields = set(song.keys())

        # All fields should be in expected set (no extra debug/internal fields)
        assert actual_fields.issubset(expected_fields), \
            f"Unexpected fields: {actual_fields - expected_fields}"
