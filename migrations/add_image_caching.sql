-- Add image caching columns to songs table
-- This allows tracking which images are cached to Supabase Storage

ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_cached_url TEXT;
-- ^^ URL to Supabase Storage (use this instead of Spotify URL for faster delivery)

ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_art_cached_at TIMESTAMP;
-- ^^ When the image was cached (helps identify stale caches)

-- Create an index for faster lookups of cached images
CREATE INDEX IF NOT EXISTS idx_songs_album_art_cached
  ON songs(album_art_cached_url)
  WHERE album_art_cached_url IS NOT NULL;

-- Migration notes:
-- This allows the backend to:
-- 1. Download album art from Spotify
-- 2. Upload to Supabase Storage
-- 3. Store the Supabase URL in the database
-- 4. Serve images from Supabase (faster, independent of Spotify)

-- Rollback (if needed):
-- ALTER TABLE songs DROP COLUMN IF EXISTS album_art_cached_url;
-- ALTER TABLE songs DROP COLUMN IF EXISTS album_art_cached_at;
-- DROP INDEX IF EXISTS idx_songs_album_art_cached;
