"""Resolve monorepo root `.env` for api/workers services."""

from __future__ import annotations

import os
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[4]
ROOT_ENV_FILE = _REPO_ROOT / ".env"


def root_env_file() -> str | None:
    return str(ROOT_ENV_FILE) if ROOT_ENV_FILE.exists() else None


def default_supabase_url(current: str) -> str:
    return current or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
