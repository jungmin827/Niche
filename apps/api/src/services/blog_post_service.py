from __future__ import annotations

import re

from src.config import Settings
from src.models.blog_post import BlogPostRecord
from src.repositories.blog_post_repo import BlogPostRepository

_MD_IMAGE_RE = re.compile(r"!\[.*?\]\((.*?)\)")


def extract_first_md_image_url(body_md: str) -> str | None:
    """body_md에서 첫 번째 마크다운 이미지 URL을 추출한다. 없으면 None."""
    match = _MD_IMAGE_RE.search(body_md)
    return match.group(1) if match else None


class BlogPostService:
    def __init__(self, repo: BlogPostRepository, settings: Settings) -> None:
        self._repo = repo
        self._settings = settings

    def _resolve_cover_url(
        self, path: str | None, body_md: str | None = None
    ) -> str | None:
        if path:
            return f"{self._settings.storage_public_base_url}/{path}"
        if body_md:
            return extract_first_md_image_url(body_md)
        return None

    async def create(
        self,
        author_id: str,
        title: str,
        body_md: str,
        excerpt: str | None,
        cover_image_path: str | None,
        visibility: str,
    ) -> BlogPostRecord:
        record = BlogPostRecord(
            author_id=author_id,
            title=title,
            body_md=body_md,
            excerpt=excerpt,
            cover_image_path=cover_image_path,
            visibility=visibility,
        )
        return await self._repo.create(record)

    async def get_by_id(self, post_id: str) -> BlogPostRecord | None:
        return await self._repo.get_by_id(post_id)

    async def list_by_author(self, author_id: str) -> list[BlogPostRecord]:
        return await self._repo.list_by_author(author_id)

    async def update(
        self,
        post_id: str,
        author_id: str,
        **fields,
    ) -> BlogPostRecord | None:
        record = await self._repo.get_by_id(post_id)
        if record is None or record.author_id != author_id:
            return None
        return await self._repo.update(post_id, **fields)

    async def list_all_public(self, limit: int = 50) -> list[BlogPostRecord]:
        return await self._repo.list_all_public(limit)

    async def delete(self, post_id: str, author_id: str) -> bool:
        record = await self._repo.get_by_id(post_id)
        if record is None or record.author_id != author_id:
            return False
        return await self._repo.soft_delete(post_id)
