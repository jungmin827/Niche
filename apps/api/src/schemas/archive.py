from __future__ import annotations

from src.schemas.common import CamelModel, PageResponse
from src.schemas.highlight import HighlightSummaryDTO


class ArchiveProfileDTO(CamelModel):
    id: str
    handle: str
    display_name: str
    bio: str | None = None
    avatar_url: str | None = None
    current_rank_code: str
    rank_score: int
    is_public: bool


class ArchiveStatsDTO(CamelModel):
    total_sessions: int
    total_focus_minutes: int
    total_blog_posts: int
    total_highlights: int
    current_streak_days: int


class ArchiveBlogPostItemDTO(CamelModel):
    id: str
    title: str
    excerpt: str | None = None
    cover_image_url: str | None = None
    visibility: str
    published_at: str | None = None


class ArchiveBlogPostsResponse(PageResponse[ArchiveBlogPostItemDTO]):
    pass


class ArchiveHighlightsResponse(PageResponse[HighlightSummaryDTO]):
    pass


class MyArchiveResponse(CamelModel):
    profile: ArchiveProfileDTO
    stats: ArchiveStatsDTO
    blog_posts: ArchiveBlogPostsResponse
    highlights: ArchiveHighlightsResponse
