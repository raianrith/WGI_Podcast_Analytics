from datetime import date
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    wistia_api_token: str = ""
    wistia_project_id: str = ""
    sync_lookback_days: int = 90
    sync_start_date: date = date(2026, 1, 1)

    supabase_url: str = "https://hnkgyxpsobjsjxfvhycb.supabase.co"
    supabase_key: str = ""
    supabase_service_role_key: str = ""

    @property
    def wistia_configured(self) -> bool:
        return bool(self.wistia_api_token)

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and (self.supabase_service_role_key or self.supabase_key))

    @property
    def supabase_write_key(self) -> str:
        return self.supabase_service_role_key or self.supabase_key


settings = Settings()
