from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="NICHE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NichE API"
    environment: Literal["local", "development", "staging", "production"] = "local"
    api_version: str = "v1"
    session_repository_backend: Literal["memory", "postgres"] = "memory"
    database_url: str | None = None
    supabase_jwt_secret: str | None = None
    default_session_visibility: Literal["public", "private"] = "public"
    default_highlight_visibility: Literal["public", "private"] = "public"
    default_planned_minutes: int = 15
    allowed_planned_minutes: tuple[int, ...] = Field(default=(15, 30, 45, 60))
    session_list_default_limit: int = 20
    session_list_max_limit: int = 50
    highlight_list_default_limit: int = 20
    highlight_list_max_limit: int = 50
    storage_public_base_url: str = "https://storage.niche.local"
    cors_allow_origins: tuple[str, ...] = Field(
        default=("http://localhost:8081", "http://127.0.0.1:8081"),
    )
    cors_allow_credentials: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
