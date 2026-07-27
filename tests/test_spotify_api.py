#!/usr/bin/env python3
"""Test Spotify API connection and preview URL fetching."""

import sys
from src.trackster.services.spotify import (
    get_spotify_access_token,
    get_track_preview_url,
)

def test_spotify():
    print("🔍 Testing Spotify API Connection...\n")

    # Test 1: Can we get an access token?
    print("1️⃣  Testing Access Token...")
    try:
        token = get_spotify_access_token()
        print(f"✅ Got access token: {token[:20]}...\n")
    except ValueError as e:
        print(f"❌ Failed to get access token:")
        print(f"   {e}\n")
        print("⚠️  Make sure your .env has:")
        print("   SPOTIFY_CLIENT_ID=your_id")
        print("   SPOTIFY_CLIENT_SECRET=your_secret")
        return False

    # Test 2: Can we fetch a preview URL?
    print("2️⃣  Testing Preview URL Fetch...")
    print("   (Using Beatles' 'Something' as test track)\n")

    test_track_id = "35iwgR4jXetI318WEWsa1Q"  # Something by The Beatles

    try:
        preview_url = get_track_preview_url(test_track_id, debug=True)
        if preview_url:
            print(f"\n✅ Got preview URL: {preview_url[:80]}...\n")
            return True
        else:
            print(f"\n⚠️  Track found but no preview URL available\n")
            return True  # This is OK - not all tracks have previews
    except Exception as e:
        print(f"\n❌ Failed to fetch preview URL: {e}\n")
        return False

if __name__ == "__main__":
    success = test_spotify()
    sys.exit(0 if success else 1)
