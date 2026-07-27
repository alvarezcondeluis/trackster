"""Supabase client initialization and helpers."""

from __future__ import annotations

import sys

from supabase import create_client

from .config import SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


def get_supabase():
    """Get or create the Supabase client.

    Prefers the service-role key when available: this backend is server-side and
    trusted, and the service-role key bypasses Row-Level Security so we can write
    to Storage (album-art cache) without exposing a public write policy. Falls
    back to the regular (anon) key for read-only setups.

    Fails early with a helpful message if credentials are missing.
    """
    if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY):
        sys.exit(
            "Supabase credentials missing.\n"
            "  Add SUPABASE_URL and SUPABASE_KEY to your .env file.\n"
            "  (Optional: SUPABASE_SERVICE_ROLE_KEY to allow Storage writes.)\n"
            "  Get them from: https://supabase.com → Settings → API"
        )

    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
    if SUPABASE_SERVICE_ROLE_KEY:
        print("🔑 Supabase: using service-role key (Storage writes enabled)")
    else:
        print("🔑 Supabase: using anon key (Storage writes may be blocked by RLS)")
    return create_client(SUPABASE_URL, key)


# Singleton: created once, reused everywhere
supabase = get_supabase()
