# Echo

A local-multiplayer, Hitster-style music guessing party game built on a Spotify
dataset. Play on one device, pass it around, and guess songs across several game
modes and eras.

## Game modes

- **Guess & Reveal** — listen to a track, then reveal it and score yourselves.
- **Name It** — type the song title before the clock runs out (fuzzy-matched). Solo-friendly.
- **Higher or Lower** — pick the more popular of two songs. Solo-friendly.

Filters: **difficulty** (by popularity) and **era** (decade / rolling windows).

## Stack

- **Frontend:** React + TanStack Router/Start, Tailwind. Spotify Web Playback SDK for full-song playback.
- **Backend:** FastAPI (`src/echo`), Supabase (song metadata + cached album art).
- **Auth:** Spotify OAuth 2.0 with PKCE (Web Playback SDK requires Spotify Premium).

## Setup

Create a `.env` from `.env.example` and fill in the Spotify + Supabase keys
(see that file for the full list, including the optional service-role key that
lets the backend cache album art to Storage).

### Backend (FastAPI)

```bash
uv sync
uv run python -m echo.api.main        # serves the API on :8000
```

### Frontend

```bash
pnpm install
pnpm dev                              # serves the app on :5173
```

## Tests

```bash
uv run pytest
```
