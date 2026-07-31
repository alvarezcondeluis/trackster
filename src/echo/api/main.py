"""FastAPI application and configuration."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router

# Create the FastAPI app
app = FastAPI(
    title="Echo API",
    description="Backend for the Hitster-style Spotify guessing game",
    version="0.1.0",
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows your React frontend (running on localhost:3000) to call this API
# (running on localhost:8000) without browser blocking the request.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ For dev only; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/")
def root() -> dict:
    """API root. Redirects you to /docs for interactive docs."""
    return {
        "message": "Echo API",
        "docs": "http://localhost:8000/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "echo.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on file changes
    )
