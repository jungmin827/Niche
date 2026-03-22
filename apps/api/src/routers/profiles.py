from __future__ import annotations

from fastapi import APIRouter, Depends

from src import error_codes
from src.config import Settings, get_settings
from src.dependencies.repositories import get_profile_repo, get_profile_service
from src.exceptions import NotFoundError
from src.models.profile import ProfileRecord
from src.repositories.profile_repo import ProfileRepository
from src.schemas.profile import (
    ProfileDTO,
    ProfileEnvelope,
    PublicProfileDTO,
    PublicProfileEnvelope,
    UpdateProfileRequest,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.profile_service import ProfileService

router = APIRouter(prefix="/v1", tags=["profiles"])


def _to_profile_dto(record: ProfileRecord, service: ProfileService) -> ProfileDTO:
    return ProfileDTO(
        id=record.id,
        handle=record.handle,
        display_name=record.display_name,
        bio=record.bio,
        avatar_url=service._resolve_avatar_url(record.avatar_path),
        is_public=record.is_public,
        current_rank_code=record.current_rank_code,
        rank_score=record.rank_score,
        onboarding_completed=record.onboarding_completed,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("/me", response_model=ProfileEnvelope)
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> ProfileEnvelope:
    record = await service.get_my_profile(current_user.profile_id)
    return ProfileEnvelope(profile=_to_profile_dto(record, service))


@router.patch("/me", response_model=ProfileEnvelope)
async def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> ProfileEnvelope:
    fields = payload.model_dump(exclude_none=True)
    record = await service.update_my_profile(current_user.profile_id, **fields)
    return ProfileEnvelope(profile=_to_profile_dto(record, service))


@router.get("/users/{profile_id}", response_model=PublicProfileEnvelope)
async def get_public_profile(
    profile_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> PublicProfileEnvelope:
    record = await service.get_public_profile(profile_id)
    if record is None:
        raise NotFoundError(
            code=error_codes.PROFILE_NOT_FOUND,
            message="Profile not found.",
        )
    return PublicProfileEnvelope(
        profile=PublicProfileDTO(
            id=record.id,
            handle=record.handle,
            display_name=record.display_name,
            bio=record.bio,
            avatar_url=service._resolve_avatar_url(record.avatar_path),
            current_rank_code=record.current_rank_code,
            rank_score=record.rank_score,
        )
    )
