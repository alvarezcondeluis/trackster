"""Download the Spotify 600k-tracks dataset from Kaggle.

Requires Kaggle API credentials. Provide them in one of two ways:

1. Put ``kaggle.json`` at ``~/.kaggle/kaggle.json`` (chmod 600), or
2. Set ``KAGGLE_USERNAME`` and ``KAGGLE_KEY`` in the project ``.env`` file.

Get the token from https://www.kaggle.com/settings -> API -> "Create New Token".

Usage:
    uv run python -m trackster.download
"""

import sys
from .config import KAGGLE_DATASET, RAW_DIR, ensure_dirs, getenv


def _check_credentials() -> None:
    """Fail early with a helpful message if no Kaggle credentials are available."""
    from pathlib import Path

    has_env = getenv("KAGGLE_USERNAME") and getenv("KAGGLE_KEY")
    has_file = (Path.home() / ".kaggle" / "kaggle.json").exists()
    if not (has_env or has_file):
        sys.exit(
            "No Kaggle credentials found.\n"
            "  Option A: place kaggle.json at ~/.kaggle/kaggle.json (chmod 600)\n"
            "  Option B: add KAGGLE_USERNAME and KAGGLE_KEY to your .env file\n"
            "  Token: https://www.kaggle.com/settings -> API -> Create New Token"
        )


def download(force: bool = False) -> None:
    """Download and unzip the dataset into ``data/raw``."""
    ensure_dirs()
    _check_credentials()

    # Imported here so that a missing/invalid credential message is shown before
    # the kaggle package tries (and fails) to authenticate at import time.
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()

    print(f"Downloading '{KAGGLE_DATASET}' into {RAW_DIR} ...")
    api.dataset_download_files(
        KAGGLE_DATASET,
        path=str(RAW_DIR),
        unzip=True,
        force=force,
        quiet=False,
    )
    print("Done. Files in data/raw:")
    for path in sorted(RAW_DIR.glob("*.csv")):
        size_mb = path.stat().st_size / 1_000_000
        print(f"  {path.name:30s} {size_mb:8.1f} MB")


if __name__ == "__main__":
    download(force="--force" in sys.argv)
