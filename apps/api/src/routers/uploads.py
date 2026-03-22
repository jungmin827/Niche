from __future__ import annotations

from fastapi import APIRouter, Depends

from src import error_codes
from src.config import Settings, get_settings
from src.exceptions import ValidationAppError
from src.schemas.upload import ALLOWED_SCOPES, PresignRequest, PresignResponse
from src.security import AuthenticatedUser, get_current_user
from src.services.upload_service import UploadService

router = APIRouter(prefix="/v1", tags=["uploads"])


def get_upload_service(settings: Settings = Depends(get_settings)) -> UploadService:
    return UploadService(settings=settings)


@router.post("/uploads/presign", response_model=PresignResponse)
async def presign_upload(
    payload: PresignRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: UploadService = Depends(get_upload_service),
) -> PresignResponse:
    if payload.scope not in ALLOWED_SCOPES:
        raise ValidationAppError(
            f"Invalid scope '{payload.scope}'. Allowed: {sorted(ALLOWED_SCOPES)}",
            details={"scope": payload.scope, "allowed": sorted(ALLOWED_SCOPES)},
        )
    return service.generate_presign(
        user_id=current_user.profile_id,
        bucket=payload.bucket,
        scope=payload.scope,
        content_type=payload.content_type,
        file_ext=payload.file_ext,
    )
