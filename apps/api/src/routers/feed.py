from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.config import Settings, get_settings
from src.dependencies.repositories import get_highlight_repository, get_profile_repo
from src.repositories.highlight_repo import HighlightRepository
from src.repositories.profile_repo import ProfileRepository
from src.schemas.feed import FeedResponse
from src.services.feed_service import FeedService

router = APIRouter(prefix="/v1", tags=["feed"])


def get_feed_service(
    settings: Settings = Depends(get_settings),
    highlight_repository: HighlightRepository = Depends(get_highlight_repository),
    profile_repository: ProfileRepository = Depends(get_profile_repo),
) -> FeedService:
    return FeedService(
        highlight_repository=highlight_repository,
        profile_repository=profile_repository,
        settings=settings,
    )


@router.get("/feed", response_model=FeedResponse)
async def list_feed(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    service: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    return await service.list_feed(cursor=cursor, limit=limit)
