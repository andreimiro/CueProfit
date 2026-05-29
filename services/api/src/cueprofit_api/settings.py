"""Runtime configuration, loaded from environment (see /.env.example)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    # Supabase (service-role: bypasses RLS — server-side only)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # GCP
    gcp_project_id: str = ""
    gcp_region: str = "europe-west1"
    kms_key_name: str = ""

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model_copilot: str = "anthropic/claude-sonnet-4"
    openrouter_model_cheap: str = "anthropic/claude-haiku-4"

    # Shared secret the Next.js BFF uses to call this service.
    python_api_internal_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
