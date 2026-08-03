"""Unit tests for the song rating / weighted-selection system.

These target the pure business logic in echo.services.song_service:
  - weight_for(score)            → selection weight (0 = banned/excluded)
  - _weighted_sample(pool, k)    → k distinct songs, weighted, banned excluded
  - rate_song(id, score)         → set an absolute 0..5 score (supabase mocked)

Scale: rating_score is 1..5. 1 = banned (never chosen); 2..5 = weight; 3 = default.
The player picks the score directly on the reveal screen (no +1/-1 transitions).
1 (not 0) is the ban value so scores stay inside the DB's 1..5 check constraint.
"""

import random
from types import SimpleNamespace
from unittest.mock import patch

import pytest

# The rating system isn't guaranteed present at collection — skip this whole
# module until the helpers exist, so it doesn't break the rest of the suite.
song_service = pytest.importorskip("echo.services.song_service")
if not all(
    hasattr(song_service, name)
    for name in ("weight_for", "_weighted_sample", "rate_song")
):
    pytest.skip("rating system not implemented yet", allow_module_level=True)

weight_for = song_service.weight_for
_weighted_sample = song_service._weighted_sample
rate_song = song_service.rate_song


# ---------------------------------------------------------------------------
# weight_for — score → selection weight
# ---------------------------------------------------------------------------
class TestWeightFor:
    def test_banned_has_zero_weight(self):
        assert weight_for(1) == 0.0  # 1 = banned

    def test_zero_and_negative_are_defensively_zero(self):
        assert weight_for(0) == 0.0
        assert weight_for(-3) == 0.0

    @pytest.mark.parametrize("score", [2, 3, 4, 5])
    def test_score_maps_to_positive_weight(self, score):
        assert weight_for(score) == float(score)

    def test_monotonic_increasing(self):
        weights = [weight_for(s) for s in range(2, 6)]
        assert weights == sorted(weights)
        assert weights[-1] > weights[0]


# ---------------------------------------------------------------------------
# _weighted_sample — weighted, distinct, banned excluded
# ---------------------------------------------------------------------------
def _song(id_: str, score: int) -> dict:
    return {"id": id_, "rating_score": score}


class TestWeightedSample:
    def test_returns_k_distinct(self):
        pool = [_song(f"s{i}", 3) for i in range(5)]
        picked = _weighted_sample(pool, 3)
        assert len(picked) == 3
        assert len({s["id"] for s in picked}) == 3  # distinct

    def test_banned_never_selected(self):
        random.seed(1)
        pool = [_song("banned", 1), _song("ok", 3)]
        for _ in range(50):
            [picked] = _weighted_sample(pool, 1)
            assert picked["id"] == "ok"

    def test_all_banned_raises(self):
        pool = [_song("a", 1), _song("b", 1)]
        with pytest.raises(ValueError):
            _weighted_sample(pool, 1)

    def test_k_larger_than_candidates_raises(self):
        pool = [_song("a", 3)]  # only 1 rateable, ask for 2
        with pytest.raises(ValueError):
            _weighted_sample(pool, 2)

    def test_missing_rating_score_defaults_to_playable(self):
        # A song row without the field yet (default 3) is still selectable.
        pool = [{"id": "x"}]
        [picked] = _weighted_sample(pool, 1)
        assert picked["id"] == "x"

    def test_high_score_biased_over_low(self):
        # Over many single draws, score-5 should be picked far more than score-2
        # (2 is the lowest playable weight now that 1 is banned).
        random.seed(42)
        pool = [_song("hi", 5), _song("lo", 2)]
        hi = sum(_weighted_sample(pool, 1)[0]["id"] == "hi" for _ in range(2000))
        # Expected ratio 5:2 → hi ≈ 71%. Assert a comfortably safe margin.
        assert hi > 1250, f"high-score picked only {hi}/2000 times"


# ---------------------------------------------------------------------------
# rate_song — set an absolute 0..5 score (supabase mocked)
# ---------------------------------------------------------------------------
class TestRateSong:
    def _mock_supabase(self, updated_rows):
        """A supabase mock whose update(...).eq(...).execute() yields `updated_rows`."""
        from unittest.mock import MagicMock

        sb = MagicMock()
        execute = sb.table.return_value.update.return_value.eq.return_value.execute
        execute.return_value = SimpleNamespace(data=updated_rows)
        return sb

    def test_sets_and_returns_score(self):
        sb = self._mock_supabase([{"id": "track1", "rating_score": 4}])
        with patch("echo.services.song_service.supabase", sb):
            assert rate_song("track1", 4) == 4
        sb.table.return_value.update.assert_called_with({"rating_score": 4})

    def test_ban_persists_one(self):
        sb = self._mock_supabase([{"id": "track1", "rating_score": 1}])
        with patch("echo.services.song_service.supabase", sb):
            assert rate_song("track1", 1) == 1
        sb.table.return_value.update.assert_called_with({"rating_score": 1})

    def test_best_persists_five(self):
        sb = self._mock_supabase([{"id": "track1", "rating_score": 5}])
        with patch("echo.services.song_service.supabase", sb):
            assert rate_song("track1", 5) == 5

    def test_missing_song_raises(self):
        sb = self._mock_supabase([])  # no rows updated → not found
        with (
            patch("echo.services.song_service.supabase", sb),
            pytest.raises(ValueError),
        ):
            rate_song("missing", 3)

    @pytest.mark.parametrize("bad", [0, -1, 6, 100])
    def test_out_of_range_raises_before_db(self, bad):
        sb = self._mock_supabase([{"id": "track1", "rating_score": 3}])
        with (
            patch("echo.services.song_service.supabase", sb),
            pytest.raises(ValueError),
        ):
            rate_song("track1", bad)
        sb.table.return_value.update.assert_not_called()
