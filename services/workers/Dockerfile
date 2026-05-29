# Cloud Run Jobs image for the worker dispatcher.
# Build from the REPO ROOT so the profit-engine path dependency is in context:
#   docker build -f services/workers/Dockerfile -t cueprofit-workers .
# The Cloud Run Job's `args` select the job, e.g. ["recompute_profit", "--workspace", "<id>"].
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /uvx /bin/

WORKDIR /app
COPY packages/profit-engine /app/packages/profit-engine
COPY services/workers /app/services/workers

WORKDIR /app/services/workers
RUN uv sync --no-dev

ENTRYPOINT ["uv", "run", "cueprofit-workers"]
