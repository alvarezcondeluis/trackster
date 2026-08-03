# Clean Pipeline Architecture

## What Changed

**Before:** Mixed pipelines based on data availability

- Config said SDK mode
- But if preview URL existed, it would use preview instead
- This caused confusion about which playback method was actually running

**Now:** Strict separation - CONFIG DECIDES, not data

---

## Two Independent Pipelines

### 🔵 PREVIEW PIPELINE (⚡ 30-second clips)

```
CONFIG: isPreviewMode = true
                ↓
Game.tsx initializes WITHOUT Spotify SDK
                ↓
Playing.tsx plays when song.preview_url exists
                ↓
unifiedPlayer.playTrack() → playPreview()
                ↓
spotifyPreviewPlayer.ts plays 30s MP3
                ↓
⚡ Instant playback (50-100ms)
```

**Requirements:**

- ✅ No Spotify authentication
- ✅ No device registration
- ✅ Preview URL must exist (99% of songs)
- ✅ Works offline

**Flow Stops If:**

- Song has no preview URL → Error "Preview URL not available"

---

### 🎵 SDK PIPELINE (Full songs)

```
CONFIG: isSdkMode = true
                ↓
Game.tsx loads Spotify Web Playback SDK
                ↓
Game.tsx initializes player device
                ↓
Playing.tsx plays when song.id exists
                ↓
unifiedPlayer.playTrack() → playSong()
                ↓
spotifyWebSdk.ts plays via Spotify
                ↓
🎵 Full song with 1-2s delay
```

**Requirements:**

- ✅ Spotify OAuth authentication
- ✅ Active device registration
- ✅ Spotify URI (song.id)
- ✅ Spotify Premium (for some regions)

**Flow Stops If:**

- Song has no ID → Error "SDK mode requires song ID"
- No auth token → Redirect to Spotify login
- Device disconnected → Reconnect via health monitor

---

## Configuration

**File:** `src/config/playback.ts`

```typescript
export const PLAYBACK_MODE: PlaybackMode = "sdk"; // ← Change this

// "hidden-audio" = Preview pipeline
// "sdk" = SDK pipeline
```

### When You Change Config

```bash
# 1. Edit src/config/playback.ts
PLAYBACK_MODE = "hidden-audio"  // or "sdk"

# 2. Restart dev server
npm run dev

# 3. Check console for:
# "🎵 Playback Pipeline: ⚡ Preview (30s clips)"
# or
# "🎵 Playback Pipeline: 🎵 SDK (Full Songs)"
```

---

## How to Debug

### Check Which Pipeline is Active

Open console on app load. You'll see:

**Preview Mode:**

```
🎵 Playback Pipeline: ⚡ Preview (30s clips)
🔍 Backend health check (attempt 1/3)...
✅ Backend is healthy
```

**SDK Mode:**

```
🎵 Playback Pipeline: 🎵 SDK (Full Songs)
🔍 Backend health check (attempt 1/3)...
📥 Loading Spotify SDK...
✅ Spotify SDK loaded
🎵 Initializing Spotify player...
```

### If Playing Fails

**Preview Pipeline errors:**

```
❌ Preview mode enabled but song has no preview URL
```

→ Song lacks preview_url field in database

**SDK Pipeline errors:**

```
❌ SDK mode enabled but missing Spotify URI
```

→ Song lacks id field in database

```
❌ Device disconnected! Attempting to reconnect...
```

→ Spotify device lost connection (health monitor will retry)

---

## Pipeline Separation Benefits

| Issue                  | Before                                    | After                               |
| ---------------------- | ----------------------------------------- | ----------------------------------- |
| **Config vs Reality**  | Config said SDK, but preview played       | Config always decides               |
| **Debugging**          | Unclear which path was executing          | Clear error messages for wrong path |
| **Fallback Confusion** | SDK failed → silently switched to preview | Explicit error if config wrong      |
| **Device Management**  | Devices could disconnect silently         | Health monitor + clear logs         |
| **Performance**        | Mixed behavior was unpredictable          | Consistent behavior per mode        |

---

## Toggling Between Modes

### Option 1: Dev Time (Quick)

```typescript
// src/config/playback.ts
export const PLAYBACK_MODE: PlaybackMode = "hidden-audio"; // ← Toggle here
```

### Option 2: Runtime (Future)

To let users choose at runtime:

1. Save mode to localStorage
2. Load on app start
3. Update config dynamically
   (This requires updating the Lobby component to actually use the PlaybackSettings selection)

---

## Summary

- **CONFIG IS LAW** - Pipeline is chosen by `src/config/playback.ts`
- **NO SILENT FALLBACKS** - If pipeline requirements aren't met, you get an error
- **CLEAR LOGGING** - Console shows which pipeline is active on startup
- **SEPARATE FLOWS** - Preview and SDK paths don't interfere

This makes the app predictable and easy to debug. 🎵
