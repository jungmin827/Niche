from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from src.models.blog_post import BlogPostRecord


class BlogPostRepository(Protocol):
    async def create(self, record: BlogPostRecord) -> BlogPostRecord: ...

    async def get_by_id(self, post_id: str) -> BlogPostRecord | None: ...

    async def list_by_author(self, author_id: str) -> list[BlogPostRecord]: ...

    async def list_all_public(self, limit: int = 50) -> list[BlogPostRecord]: ...

    async def update(self, post_id: str, **fields) -> BlogPostRecord | None: ...

    async def soft_delete(self, post_id: str) -> bool: ...


class InMemoryBlogPostRepository:
    def __init__(self) -> None:
        self._posts: dict[str, BlogPostRecord] = {}

    async def create(self, record: BlogPostRecord) -> BlogPostRecord:
        self._posts[record.id] = record
        return record

    async def get_by_id(self, post_id: str) -> BlogPostRecord | None:
        record = self._posts.get(post_id)
        if record is None or record.deleted_at is not None:
            return None
        return record

    async def list_by_author(self, author_id: str) -> list[BlogPostRecord]:
        return [
            r
            for r in self._posts.values()
            if r.author_id == author_id and r.deleted_at is None
        ]

    async def update(self, post_id: str, **fields) -> BlogPostRecord | None:
        record = self._posts.get(post_id)
        if record is None or record.deleted_at is not None:
            return None
        now = datetime.now(timezone.utc)
        for key, value in fields.items():
            if value is not None and hasattr(record, key):
                object.__setattr__(record, key, value)
        object.__setattr__(record, "updated_at", now)
        return record

    async def list_all_public(self, limit: int = 50) -> list[BlogPostRecord]:
        results = [
            r
            for r in self._posts.values()
            if r.visibility == "public" and r.deleted_at is None
        ]
        results.sort(key=lambda r: r.published_at, reverse=True)
        return results[:limit]

    async def soft_delete(self, post_id: str) -> bool:
        record = self._posts.get(post_id)
        if record is None or record.deleted_at is not None:
            return False
        object.__setattr__(record, "deleted_at", datetime.now(timezone.utc))
        return True
