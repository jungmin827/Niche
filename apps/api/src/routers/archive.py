from fastapi import APIRouter, Depends, Query

from src.config import Settings, get_settings
from src.dependencies.repositories import get_highlight_repository
from src.repositories.highlight_repo import HighlightRepository
from src.schemas.archive import MyArchiveResponse
from src.security import AuthenticatedUser, get_current_user
from src.services.archive_service import ArchiveService

router = APIRouter(prefix="/v1", tags=["archive"])


def get_archive_service(
    settings: Settings = Depends(get_settings),
    highlight_repository: HighlightRepository = Depends(get_highlight_repository),
) -> ArchiveService:
    return ArchiveService(
        highlight_repository=highlight_repository,
        settings=settings,
    )


@router.get("/me/archive", response_model=MyArchiveResponse)
async def get_my_archive(
    blog_cursor: str | None = Query(default=None, alias="blogCursor"),
    highlight_cursor: str | None = Query(default=None, alias="highlightCursor"),
    blog_limit: int = Query(default=20, ge=1, le=50, alias="blogLimit"),
    highlight_limit: int = Query(default=20, ge=1, le=50, alias="highlightLimit"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: ArchiveService = Depends(get_archive_service),
) -> MyArchiveResponse:
    return await service.get_my_archive(
        current_user=current_user,
        blog_cursor=blog_cursor,
        highlight_cursor=highlight_cursor,
        blog_limit=blog_limit,
        highlight_limit=highlight_limit,
    )
