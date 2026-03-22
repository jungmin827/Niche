from __future__ import annotations

from src.config import Settings
from src.repositories.highlight_repo import HighlightRepository
from src.schemas.feed import WaveFeedResponse, WaveItemDTO
from src.services.highlight_serialization import build_storage_url


class WaveFeedService:
    def __init__(self, *, highlight_repository: HighlightRepository, settings: Settings) -> None:
        self._highlight_repository = highlight_repository
        self._settings = settings

    async def get_wave(self, *, limit: int) -> WaveFeedResponse:
        rows = await self._highlight_repository.get_wave_items(limit=limit)
        items = [
            WaveItemDTO(
                highlight_id=row.highlight_id,
                title=row.title,
                author_handle=row.author_handle,
                topic=row.topic,
                image_url=build_storage_url(
                    path=row.rendered_image_path,
                    settings=self._settings,
                ),
            )
            for row in rows
        ]
        return WaveFeedResponse(wave_items=items)
