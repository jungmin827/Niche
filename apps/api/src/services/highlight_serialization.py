from src.config import Settings
from src.models.highlight import HighlightRecord
from src.schemas.highlight import HighlightAuthor, HighlightDetailDTO, HighlightSummaryDTO


def build_highlight_summary(
    *, highlight: HighlightRecord, settings: Settings
) -> HighlightSummaryDTO:
    return HighlightSummaryDTO(
        id=highlight.id,
        sourceType=highlight.source_type,
        sessionId=highlight.session_id,
        bundleId=highlight.bundle_id,
        title=highlight.title,
        caption=highlight.caption,
        templateCode=highlight.template_code,
        renderedImageUrl=build_storage_url(path=highlight.rendered_image_path, settings=settings),
        sourcePhotoUrl=build_storage_url(path=highlight.source_photo_path, settings=settings),
        visibility=highlight.visibility,
        publishedAt=highlight.published_at,
    )


def build_highlight_detail(
    *,
    highlight: HighlightRecord,
    settings: Settings,
    author: HighlightAuthor,
) -> HighlightDetailDTO:
    return HighlightDetailDTO(
        id=highlight.id,
        author=author,
        sourceType=highlight.source_type,
        sessionId=highlight.session_id,
        bundleId=highlight.bundle_id,
        title=highlight.title,
        caption=highlight.caption,
        templateCode=highlight.template_code,
        renderedImageUrl=build_storage_url(path=highlight.rendered_image_path, settings=settings),
        sourcePhotoUrl=build_storage_url(path=highlight.source_photo_path, settings=settings),
        visibility=highlight.visibility,
        publishedAt=highlight.published_at,
    )


def build_storage_url(*, path: str | None, settings: Settings) -> str | None:
    if path is None:
        return None
    return f"{settings.storage_public_base_url.rstrip('/')}/{path.lstrip('/')}"
