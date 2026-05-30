# Cloud Run service image for the FastAPI API.
# Build from the REPO ROOT so path dependencies are in context:
#   docker build -f services/api/Dockerfile -t cueprofit-api .
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /uvx /bin/

WORKDIR /app
# Path dependencies must be copied before syncing the service.
COPY packages/profit-engine /app/packages/profit-engine
COPY packages/security /app/packages/security
COPY services/api /app/services/api

WORKDIR /app/services/api
RUN uv sync --no-dev

EXPOSE 8080
# Cloud Run injects $PORT (default 8080).
CMD ["sh", "-c", "uv run uvicorn cueprofit_api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
