"""Worker runtime configuration (see /.env.example)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from cueprofit_workers.env import default_supabase_url, root_env_file


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=root_env_file(), extra="ignore")

    app_env: str = "development"

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    kms_key_name: str = ""

    google_ads_oauth_client_id: str = ""
    google_ads_oauth_client_secret: str = ""
    google_ads_developer_token: str = ""
    google_ads_login_customer_id: str = ""

    @model_validator(mode="after")
    def _fill_defaults(self) -> Settings:
        if not self.supabase_url:
            self.supabase_url = default_supabase_url(self.supabase_url)
        return self


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
