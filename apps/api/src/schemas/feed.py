from __future__ import annotations

from src.schemas.common import CamelModel


class WaveItemDTO(CamelModel):
    highlight_id: str
    title: str
    author_handle: str
    topic: str | None
    image_url: str | None


class WaveFeedResponse(CamelModel):
    wave_items: list[WaveItemDTO]
