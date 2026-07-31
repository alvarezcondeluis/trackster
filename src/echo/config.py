"""Central configuration and shared paths for the project.

Loads environment variables from a local ``.env`` file (never committed) so that
credentials such as the Kaggle API token and Supabase keys stay out of the code.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Project layout ------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = PROJECT_ROOT / "reports"

# Kaggle dataset slug (owner/dataset-name)
KAGGLE_DATASET = "yamaerenay/spotify-dataset-19212020-600k-tracks"

# Load .env from the project root if present.
load_dotenv(PROJECT_ROOT / ".env")


def getenv(key: str, default: str | None = None) -> str | None:
    """Small helper so callers can import a single source of truth for env vars."""
    return os.getenv(key, default)


# Supabase (used later, when we populate the database) ----------------------
SUPABASE_URL = getenv("SUPABASE_URL")
SUPABASE_KEY = getenv("SUPABASE_KEY")
# Optional service-role key. Server-side only — bypasses Row-Level Security so
# the backend can write to Storage (album-art cache) without a public policy.
SUPABASE_SERVICE_ROLE_KEY = getenv("SUPABASE_SERVICE_ROLE_KEY")


def ensure_dirs() -> None:
    """Create the data/report directories if they do not exist yet."""
    for directory in (RAW_DIR, PROCESSED_DIR, REPORTS_DIR):
        directory.mkdir(parents=True, exist_ok=True)
