"""CueProfit FastAPI service entrypoint.

Hosts synchronous reads the frontend/AI copilot need (profit queries, on-demand
recompute) and the AI tool-runner. Long-running sync/modeling lives in workers.
"""

from __future__ import annotations

from fastapi import FastAPI

from cueprofit_api.connect_api import router as connect_router
from cueprofit_api.settings import get_settings

app = FastAPI(title="CueProfit API", version="0.0.0")
app.include_router(connect_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe for Cloud Run."""
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    settings = get_settings()
    return {"service": "cueprofit-api", "version": "0.0.0", "env": settings.app_env}
