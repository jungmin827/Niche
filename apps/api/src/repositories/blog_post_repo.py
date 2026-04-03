from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

try:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.base import VisibilityDBEnum
    from src.models.blog_post_table import BlogPostTable
except ModuleNotFoundError:  # pragma: no cover
    select = None
    AsyncSession = Any
    async_sessionmaker = Any
    VisibilityDBEnum = None
    BlogPostTable = None

from src.models.blog_post import BlogPostRecord


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _visibility_to_db(value: str) -> VisibilityDBEnum:
    return VisibilityDBEnum(value)


class BlogPostRepository(Protocol):
    async def create(self, record: BlogPostRecord) -> BlogPostRecord: ...

    async def get_by_id(self, post_id: str) -> BlogPostRecord | None: ...

    async def list_by_author(self, author_id: str) -> list[BlogPostRecord]: ...

    async def list_public_by_author(self, author_id: str) -> list[BlogPostRecord]: ...

    async def list_all_public(self, limit: int = 50) -> list[BlogPostRecord]: ...

    async def update(self, post_id: str, **fields) -> BlogPostRecord | None: ...

    async def soft_delete(self, post_id: str) -> bool: ...


class PostgresBlogPostRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create(self, record: BlogPostRecord) -> BlogPostRecord:
        table = BlogPostTable(
            id=record.id,
            profile_id=record.author_id,
            title=record.title,
            excerpt=record.excerpt,
            body_md=record.body_md,
            cover_image_path=record.cover_image_path,
            visibility=_visibility_to_db(record.visibility),
            published_at=record.published_at,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_record(table)

    async def get_by_id(self, post_id: str) -> BlogPostRecord | None:
        statement = select(BlogPostTable).where(
            BlogPostTable.id == post_id,
            BlogPostTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_record(row) if row else None

    async def list_by_author(self, author_id: str) -> list[BlogPostRecord]:
        statement = (
            select(BlogPostTable)
            .where(
                BlogPostTable.profile_id == author_id,
                BlogPostTable.deleted_at.is_(None),
            )
            .order_by(BlogPostTable.published_at.desc())
        )
        async with self._session_factory() as db:
            rows = (await db.execute(statement)).scalars().all()
            return [self._to_record(r) for r in rows]

    async def list_public_by_author(self, author_id: str) -> list[BlogPostRecord]:
        statement = (
            select(BlogPostTable)
            .where(
                BlogPostTable.profile_id == author_id,
                BlogPostTable.visibility == VisibilityDBEnum.PUBLIC,
                BlogPostTable.deleted_at.is_(None),
            )
            .order_by(BlogPostTable.published_at.desc())
        )
        async with self._session_factory() as db:
            rows = (await db.execute(statement)).scalars().all()
            return [self._to_record(r) for r in rows]

    async def list_all_public(self, limit: int = 50) -> list[BlogPostRecord]:
        statement = (
            select(BlogPostTable)
            .where(
                BlogPostTable.visibility == VisibilityDBEnum.PUBLIC,
                BlogPostTable.deleted_at.is_(None),
            )
            .order_by(BlogPostTable.published_at.desc())
            .limit(limit)
        )
        async with self._session_factory() as db:
            rows = (await db.execute(statement)).scalars().all()
            return [self._to_record(r) for r in rows]

    async def update(self, post_id: str, **fields) -> BlogPostRecord | None:
        _allowed = {"title", "excerpt", "body_md", "cover_image_path", "published_at"}
        async with self._session_factory() as db:
            row = await db.get(BlogPostTable, post_id)
            if row is None or row.deleted_at is not None:
                return None
            for key, value in fields.items():
                if value is None:
                    continue
                if key == "visibility":
                    row.visibility = _visibility_to_db(value)
                elif key in _allowed:
                    setattr(row, key, value)
            row.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(row)
            return self._to_record(row)

    async def soft_delete(self, post_id: str) -> bool:
        async with self._session_factory() as db:
            row = await db.get(BlogPostTable, post_id)
            if row is None or row.deleted_at is not None:
                return False
            row.deleted_at = datetime.now(timezone.utc)
            await db.commit()
            return True

    def _to_record(self, row: BlogPostTable) -> BlogPostRecord:
        visibility = (
            row.visibility.value
            if isinstance(row.visibility, VisibilityDBEnum)
            else str(row.visibility)
        )
        return BlogPostRecord(
            id=row.id,
            author_id=row.profile_id,
            title=row.title,
            excerpt=row.excerpt,
            body_md=row.body_md,
            cover_image_path=row.cover_image_path,
            visibility=visibility,
            published_at=_normalize_timestamp(row.published_at),
            created_at=_normalize_timestamp(row.created_at),
            updated_at=_normalize_timestamp(row.updated_at),
            deleted_at=row.deleted_at,
        )


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

    async def list_public_by_author(self, author_id: str) -> list[BlogPostRecord]:
        results = [
            r
            for r in self._posts.values()
            if r.author_id == author_id
            and r.visibility == "public"
            and r.deleted_at is None
        ]
        results.sort(key=lambda r: r.published_at, reverse=True)
        return results

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
