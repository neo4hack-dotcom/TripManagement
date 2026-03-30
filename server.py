from __future__ import annotations

import os

import uvicorn

from backend.app import app


def main() -> None:
    uvicorn.run(
        "server:app",
        host=os.getenv("API_HOST", "127.0.0.1"),
        port=int(os.getenv("API_PORT", "8000")),
        reload=os.getenv("API_RELOAD", "true").lower() != "false",
    )


if __name__ == "__main__":
    main()
