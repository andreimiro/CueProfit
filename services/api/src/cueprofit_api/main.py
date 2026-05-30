"""CueProfit FastAPI service entrypoint.

Hosts synchronous reads the frontend/AI copilot need (profit queries, on-demand
recompute) and the AI tool-runner. Long-running sync/modeling lives in workers.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from cueprofit_api.ai_api import router as ai_router
from cueprofit_api.connect_api import router as connect_router
from cueprofit_api.settings import get_settings

settings = get_settings()

app = FastAPI(title="CueProfit API", version="0.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def reject_untrusted_browser_origins(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and origin not in settings.allowed_origin_list:
        return JSONResponse({"detail": "origin not allowed"}, status_code=403)
    return await call_next(request)


app.include_router(connect_router)
app.include_router(ai_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe for Cloud Run."""
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "cueprofit-api", "version": "0.0.0", "env": settings.app_env}
