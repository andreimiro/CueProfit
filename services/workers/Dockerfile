# Cloud Run Jobs image for the worker dispatcher.
# Build from the REPO ROOT so path dependencies are in context:
#   docker build -f services/workers/Dockerfile -t cueprofit-workers .
# The Cloud Run Job's `args` select the job, e.g. ["sync_workspace", "--workspace", "<id>", "--mode", "initial"].
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /uvx /bin/

WORKDIR /app
COPY packages/profit-engine /app/packages/profit-engine
COPY packages/google-clients /app/packages/google-clients
COPY packages/identity-resolver /app/packages/identity-resolver
COPY packages/security /app/packages/security
COPY services/workers /app/services/workers

WORKDIR /app/services/workers
RUN uv sync --no-dev

ENTRYPOINT ["/app/services/workers/.venv/bin/cueprofit-workers"]
