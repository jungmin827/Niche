from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.config import Settings, get_settings
from src.dependencies.repositories import get_highlight_repository
from src.repositories.highlight_repo import HighlightRepository
from src.schemas.feed import WaveFeedResponse
from src.security import AuthenticatedUser, get_current_user
from src.services.wave_feed_service import WaveFeedService

router = APIRouter(prefix="/v1", tags=["feed"])


def get_wave_feed_service(
    highlight_repository: HighlightRepository = Depends(get_highlight_repository),
    settings: Settings = Depends(get_settings),
) -> WaveFeedService:
    return WaveFeedService(highlight_repository=highlight_repository, settings=settings)


@router.get("/feed/wave", response_model=WaveFeedResponse)
async def get_feed_wave(
    limit: int = Query(default=30, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: WaveFeedService = Depends(get_wave_feed_service),
) -> WaveFeedResponse:
    return await service.get_wave(limit=limit)
