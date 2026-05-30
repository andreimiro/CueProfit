"""Runtime configuration, loaded from environment (see /.env.example)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from cueprofit_api.env import default_supabase_url, root_env_file


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=root_env_file(), extra="ignore")

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
    allowed_origins: str = (
        "https://app.captioncue.shop,https://captioncue.shop,https://captioncue.com"
    )

    # Google data-connection OAuth (our own offline flow)
    google_ads_oauth_client_id: str = ""
    google_ads_oauth_client_secret: str = ""
    google_ads_oauth_redirect_uri: str = ""
    google_merchant_oauth_redirect_uri: str = ""
    google_ads_developer_token: str = ""

    @property
    def merchant_oauth_redirect_uri(self) -> str:
        if self.google_merchant_oauth_redirect_uri:
            return self.google_merchant_oauth_redirect_uri
        if self.google_ads_oauth_redirect_uri:
            return self.google_ads_oauth_redirect_uri.replace(
                "/api/connect/google/callback", "/api/connect/merchant/callback"
            )
        return ""
    # Secret used to HMAC-sign the OAuth state token. Falls back to the internal
    # token if unset (both are server-only secrets).
    oauth_state_secret: str = ""

    # Worker orchestration (see sync_workspace job)
    workers_cloud_run_job: str = ""
    # Dev-only: spawn `cueprofit-workers sync_workspace` locally after connect.
    workers_inline_sync: bool = False

    @model_validator(mode="after")
    def _fill_defaults(self) -> Settings:
        if not self.supabase_url:
            self.supabase_url = default_supabase_url(self.supabase_url)
        return self

    @property
    def state_secret(self) -> str:
        if self.oauth_state_secret:
            return self.oauth_state_secret
        if self.app_env == "development":
            return self.python_api_internal_token  # dev convenience only
        raise RuntimeError("OAUTH_STATE_SECRET is required outside development")

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
