"""Test the API endpoints.

These are integration tests: they hit the real Supabase-backed endpoints, so a
valid .env + populated `songs` table (with the `rating_score` column) is needed.
Playback is SDK-only, so songs no longer carry a preview_url.
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from echo.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


# Fields the Song model exposes (nothing else should leak into responses).
SONG_FIELDS = {
    "id",
    "name",
    "artist_name",
    "artists",
    "genres",
    "year",
    "popularity",
    "preview_url",
    "album_art_url",
    "album_name",
    "rating_score",
}


class TestHealth:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestSongBatch:
    """The batch endpoint is the game's main song source."""

    def test_batch_returns_200_list(self, client):
        response = client.get("/api/songs/batch")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_batch_default_count_is_one(self, client):
        songs = client.get("/api/songs/batch").json()
        assert len(songs) == 1

    def test_batch_count_returns_that_many(self, client):
        songs = client.get("/api/songs/batch?count=3").json()
        assert len(songs) == 3

    def test_batch_count_returns_distinct(self, client):
        songs = client.get("/api/songs/batch?count=3").json()
        ids = [s["id"] for s in songs]
        assert len(set(ids)) == len(ids)

    def test_song_has_required_fields(self, client):
        song = client.get("/api/songs/batch").json()[0]
        for field in ("id", "name", "artist_name", "rating_score"):
            assert field in song and song[field] is not None

    def test_name_and_artist_non_empty(self, client):
        song = client.get("/api/songs/batch").json()[0]
        assert isinstance(song["name"], str) and song["name"].strip()
        assert isinstance(song["artist_name"], str) and song["artist_name"].strip()

    def test_id_is_non_empty_string(self, client):
        song = client.get("/api/songs/batch").json()[0]
        assert isinstance(song["id"], str) and len(song["id"]) > 0

    def test_year_reasonable_when_present(self, client):
        song = client.get("/api/songs/batch").json()[0]
        if song.get("year") is not None:
            assert 1920 <= song["year"] <= 2030

    def test_popularity_in_range_when_present(self, client):
        song = client.get("/api/songs/batch").json()[0]
        if song.get("popularity") is not None:
            assert 0 <= song["popularity"] <= 100

    def test_genres_is_list_or_none(self, client):
        song = client.get("/api/songs/batch").json()[0]
        genres = song.get("genres")
        assert genres is None or all(isinstance(g, str) for g in genres)

    def test_offset_is_respected(self, client):
        # An explicit offset should still return a valid batch.
        response = client.get("/api/songs/batch?offset=0&count=2")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_no_unexpected_fields(self, client):
        song = client.get("/api/songs/batch").json()[0]
        assert set(song.keys()).issubset(SONG_FIELDS), (
            f"Unexpected fields: {set(song.keys()) - SONG_FIELDS}"
        )


class TestMultipleCalls:
    def test_multiple_calls_return_different_songs(self, client):
        ids = set()
        for _ in range(5):
            ids.add(client.get("/api/songs/batch").json()[0]["id"])
        assert len(ids) >= 3, f"Only {len(ids)} unique songs in 5 calls"


class TestDifficultyFiltering:
    def test_easy_is_high_popularity(self, client):
        song = client.get("/api/songs/batch?difficulty=easy").json()[0]
        if song.get("popularity") is not None:
            assert song["popularity"] >= 75

    def test_medium_popularity_threshold(self, client):
        song = client.get("/api/songs/batch?difficulty=medium").json()[0]
        if song.get("popularity") is not None:
            assert song["popularity"] >= 40

    def test_hard_has_no_floor(self, client):
        response = client.get("/api/songs/batch?difficulty=hard")
        assert response.status_code == 200


class TestCount:
    def test_count_returns_int(self, client):
        response = client.get("/api/songs/count")
        assert response.status_code == 200
        assert isinstance(response.json(), int)
        assert response.json() >= 0

    def test_narrow_era_not_more_than_all(self, client):
        total_all = client.get("/api/songs/count?era=all").json()
        total_80s = client.get("/api/songs/count?era=80s").json()
        assert total_80s <= total_all  # 80s is a subset of all-time

    def test_invalid_difficulty_returns_400(self, client):
        response = client.get("/api/songs/count?difficulty=nope")
        assert response.status_code == 400


class TestArt:
    def test_art_endpoint_returns_shape(self, client):
        song = client.get("/api/songs/batch").json()[0]
        # Mock Spotify so the test never makes a real network call if art is uncached.
        with (
            patch(
                "echo.services.song_service.get_track_album_art",
                return_value={"album_name": "X", "album_art_url": "https://img/x.jpg"},
            ),
            patch(
                "echo.services.song_service.cache_album_art_to_supabase",
                return_value=None,
            ),
        ):
            response = client.get(f"/api/songs/{song['id']}/art")
        assert response.status_code == 200
        body = response.json()
        assert "album_art_url" in body and "album_name" in body


class TestErrorHandling:
    def test_invalid_difficulty_returns_400(self, client):
        response = client.get("/api/songs/batch?difficulty=invalid_difficulty")
        assert response.status_code == 400
        assert "detail" in response.json()

    def test_default_difficulty_works(self, client):
        assert client.get("/api/songs/batch").status_code == 200

    def test_difficulty_is_case_sensitive(self, client):
        # Documents current behavior: "EASY" is not a valid key.
        assert client.get("/api/songs/batch?difficulty=EASY").status_code == 400
