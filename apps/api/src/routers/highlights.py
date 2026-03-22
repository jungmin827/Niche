from fastapi import APIRouter, Depends, Query, status

from src.config import Settings, get_settings
from src.dependencies.repositories import get_highlight_repository, get_session_repository
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.session_repo import SessionRepository
from src.schemas.highlight import (
    HighlightCreateRequest,
    HighlightListResponse,
    HighlightResponse,
    HighlightUpdateRequest,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.highlight_service import HighlightService

router = APIRouter(prefix="/v1", tags=["highlights"])


def get_highlight_service(
    settings: Settings = Depends(get_settings),
    highlight_repository: HighlightRepository = Depends(get_highlight_repository),
    session_repository: SessionRepository = Depends(get_session_repository),
) -> HighlightService:
    return HighlightService(
        highlight_repository=highlight_repository,
        session_repository=session_repository,
        settings=settings,
    )


@router.post("/highlights", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
async def create_highlight(
    payload: HighlightCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: HighlightService = Depends(get_highlight_service),
) -> HighlightResponse:
    return await service.create_highlight(current_user=current_user, payload=payload)


@router.get("/highlights/{highlight_id}", response_model=HighlightResponse)
async def get_highlight(
    highlight_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: HighlightService = Depends(get_highlight_service),
) -> HighlightResponse:
    return await service.get_highlight(current_user=current_user, highlight_id=highlight_id)


@router.patch("/highlights/{highlight_id}", response_model=HighlightResponse)
async def update_highlight(
    highlight_id: str,
    payload: HighlightUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: HighlightService = Depends(get_highlight_service),
) -> HighlightResponse:
    return await service.update_highlight(
        current_user=current_user,
        highlight_id=highlight_id,
        payload=payload,
    )


@router.get("/me/highlights", response_model=HighlightListResponse)
async def list_my_highlights(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: HighlightService = Depends(get_highlight_service),
) -> HighlightListResponse:
    return await service.list_my_highlights(current_user=current_user, cursor=cursor, limit=limit)


@router.get("/users/{profile_id}/highlights", response_model=HighlightListResponse)
async def list_user_highlights(
    profile_id: str,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: HighlightService = Depends(get_highlight_service),
) -> HighlightListResponse:
    return await service.list_user_highlights(
        current_user=current_user,
        profile_id=profile_id,
        cursor=cursor,
        limit=limit,
    )
