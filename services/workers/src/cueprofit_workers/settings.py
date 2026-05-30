"""Worker runtime configuration (see /.env.example)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    kms_key_name: str = ""

    google_ads_oauth_client_id: str = ""
    google_ads_oauth_client_secret: str = ""
    google_ads_developer_token: str = ""
    google_ads_login_customer_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


def build_cipher(settings: Settings):
    if settings.kms_key_name:
        from cueprofit_security import get_kms_cipher

        return get_kms_cipher(settings.kms_key_name)
    if settings.app_env == "development":
        from cueprofit_security import FakeCipher

        return FakeCipher()
    raise RuntimeError("KMS_KEY_NAME is required outside development")
