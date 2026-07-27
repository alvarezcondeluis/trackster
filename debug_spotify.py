#!/usr/bin/env python3
"""Debug script to test Spotify API and song service."""

from src.trackster.services.song_service import get_random_song
from src.trackster.services.spotify import get_track_preview_url

print("=" * 60)
print("TRACKSTER SPOTIFY DEBUG SCRIPT")
print("=" * 60)

# Test 1: Try to get a song with debug output
print("\n[TEST 1] Fetching random song with EASY difficulty (debug mode)")
print("-" * 60)

try:
    song = get_random_song(difficulty="easy", debug=True)
    print(f"\n✅ SUCCESS!")
    print(f"Song: {song.name}")
    print(f"Artist: {song.artist_name}")
    print(f"Year: {song.year}")
    print(f"Preview: {song.preview_url[:100]}..." if song.preview_url else "No preview")
except ValueError as e:
    print(f"\n❌ FAILED: {e}")

# Test 2: Test a specific track ID
print("\n\n[TEST 2] Testing specific Spotify track (Shape of You)")
print("-" * 60)
track_id = "7qiZfU4dY1lsylvNFutFqe"  # "Shape of You" by Ed Sheeran
print(f"Track ID: {track_id}")
preview = get_track_preview_url(track_id, debug=True)
if preview:
    print(f"\n✅ Preview found: {preview[:100]}...")
else:
    print(f"\n❌ No preview found")

# Test 3: Test a song from our database
print("\n\n[TEST 3] Testing random song from database")
print("-" * 60)
from src.trackster.db import supabase

response = supabase.table("songs").select("id, name").limit(1).execute()
if response.data:
    song = response.data[0]
    print(f"Testing: {song['name']}")
    print(f"ID: {song['id']}")
    preview = get_track_preview_url(song['id'], debug=True)
    if preview:
        print(f"\n✅ Preview found: {preview[:100]}...")
    else:
        print(f"\n❌ No preview found")
else:
    print("❌ No songs in database")

print("\n" + "=" * 60)
print("DEBUG SCRIPT COMPLETE")
print("=" * 60)
