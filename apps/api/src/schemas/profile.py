from __future__ import annotations

from datetime import datetime

from src.schemas.common import CamelModel


class ProfileDTO(CamelModel):
    id: str
    handle: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    is_public: bool
    current_rank_code: str
    rank_score: int
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


class PublicProfileDTO(CamelModel):
    """Reduced view for other users — no private fields."""
    id: str
    handle: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    current_rank_code: str
    rank_score: int


class ProfileEnvelope(CamelModel):
    profile: ProfileDTO


class PublicProfileEnvelope(CamelModel):
    profile: PublicProfileDTO


class UpdateProfileRequest(CamelModel):
    display_name: str | None = None
    bio: str | None = None
    handle: str | None = None
    is_public: bool | None = None


class ProfileAuthorDTO(CamelModel):
    """Minimal DTO used by archive and feed services for author info."""
    id: str
    handle: str
    display_name: str
    avatar_url: str | None = None
    current_rank_code: str = "surface"
