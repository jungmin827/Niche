from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

try:
    from sqlalchemy import Select, and_, func, or_, select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.base import HighlightSourceTypeDBEnum, VisibilityDBEnum
    from src.models.highlight_tables import HighlightTable
    from src.models.profile_table import ProfileTable
    from src.models.session_tables import SessionTable
except ModuleNotFoundError:  # pragma: no cover - exercised only in minimal local envs
    Select = Any
    AsyncSession = Any
    async_sessionmaker = Any
    and_ = None
    func = None
    or_ = None
    select = None
    HighlightSourceTypeDBEnum = None
    VisibilityDBEnum = None
    HighlightTable = None
    ProfileTable = None
    SessionTable = None

from src.models.highlight import HighlightRecord


@dataclass
class WaveItemRow:
    highlight_id: str
    title: str
    author_handle: str
    topic: str | None
    rendered_image_path: str


class HighlightRepository(Protocol):
    async def create_highlight(
        self, *, highlight: HighlightRecord
    ) -> HighlightRecord: ...

    async def get_highlight(self, *, highlight_id: str) -> HighlightRecord | None: ...

    async def update_highlight(
        self, *, highlight: HighlightRecord
    ) -> HighlightRecord: ...

    async def find_by_source(
        self, *, source_type: str, session_id: str | None, bundle_id: str | None
    ) -> HighlightRecord | None: ...

    async def list_highlights(
        self,
        *,
        profile_id: str,
        visibility: str | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]: ...

    async def count_highlights(
        self, *, profile_id: str, visibility: str | None
    ) -> int: ...

    async def delete_highlight(self, *, highlight_id: str) -> bool: ...

    async def list_public_highlights(
        self,
        *,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]: ...

    async def get_wave_items(self, *, limit: int) -> list[WaveItemRow]: ...


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _encode_cursor(published_at: datetime, highlight_id: str) -> str:
    payload = json.dumps(
        {
            "publishedAt": _normalize_timestamp(published_at).isoformat(),
            "id": highlight_id,
        }
    ).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("utf-8")


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        payload = json.loads(
            base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8")
        )
        return datetime.fromisoformat(payload["publishedAt"]), payload["id"]
    except Exception as exc:
        raise ValueError("Invalid cursor.") from exc


class InMemoryHighlightRepository:
    def __init__(self) -> None:
        self._highlights: dict[str, HighlightRecord] = {}

    async def create_highlight(self, *, highlight: HighlightRecord) -> HighlightRecord:
        self._highlights[highlight.id] = highlight
        return highlight

    async def get_highlight(self, *, highlight_id: str) -> HighlightRecord | None:
        return self._highlights.get(highlight_id)

    async def update_highlight(self, *, highlight: HighlightRecord) -> HighlightRecord:
        self._highlights[highlight.id] = highlight
        return highlight

    async def find_by_source(
        self, *, source_type: str, session_id: str | None, bundle_id: str | None
    ) -> HighlightRecord | None:
        for highlight in self._highlights.values():
            if (
                highlight.source_type == source_type
                and highlight.session_id == session_id
                and highlight.bundle_id == bundle_id
            ):
                return highlight
        return None

    async def list_highlights(
        self,
        *,
        profile_id: str,
        visibility: str | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]:
        highlights = [
            highlight
            for highlight in self._highlights.values()
            if highlight.profile_id == profile_id
            and (visibility is None or highlight.visibility == visibility)
        ]
        highlights.sort(
            key=lambda item: (_normalize_timestamp(item.published_at), item.id),
            reverse=True,
        )

        if cursor:
            cursor_published_at, cursor_id = _decode_cursor(cursor)
            highlights = [
                highlight
                for highlight in highlights
                if (_normalize_timestamp(highlight.published_at), highlight.id)
                < (cursor_published_at, cursor_id)
            ]

        page = highlights[:limit]
        has_next = len(highlights) > limit
        next_cursor = None
        if has_next and page:
            last_item = page[-1]
            next_cursor = _encode_cursor(last_item.published_at, last_item.id)
        return page, next_cursor, has_next

    async def delete_highlight(self, *, highlight_id: str) -> bool:
        if highlight_id in self._highlights:
            del self._highlights[highlight_id]
            return True
        return False

    async def count_highlights(self, *, profile_id: str, visibility: str | None) -> int:
        return len(
            [
                highlight
                for highlight in self._highlights.values()
                if highlight.profile_id == profile_id
                and (visibility is None or highlight.visibility == visibility)
            ]
        )

    async def list_public_highlights(
        self,
        *,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]:
        highlights = [h for h in self._highlights.values() if h.visibility == "public"]
        highlights.sort(
            key=lambda h: (_normalize_timestamp(h.published_at), h.id), reverse=True
        )

        if cursor:
            cursor_published_at, cursor_id = _decode_cursor(cursor)
            highlights = [
                h
                for h in highlights
                if (_normalize_timestamp(h.published_at), h.id)
                < (cursor_published_at, cursor_id)
            ]

        page = highlights[:limit]
        has_next = len(highlights) > limit
        next_cursor = None
        if has_next and page:
            last_item = page[-1]
            next_cursor = _encode_cursor(last_item.published_at, last_item.id)
        return page, next_cursor, has_next

    async def get_wave_items(self, *, limit: int) -> list[WaveItemRow]:
        # In-memory backend has no profile/session join — return empty list.
        return []


class PostgresHighlightRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        _require_sqlalchemy()
        self._session_factory = session_factory

    async def create_highlight(self, *, highlight: HighlightRecord) -> HighlightRecord:
        table = self._build_highlight_table(highlight)
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_highlight_record(table)

    async def get_highlight(self, *, highlight_id: str) -> HighlightRecord | None:
        statement = select(HighlightTable).where(
            HighlightTable.id == highlight_id,
            HighlightTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_highlight_record(row) if row else None

    async def update_highlight(self, *, highlight: HighlightRecord) -> HighlightRecord:
        async with self._session_factory() as db:
            existing = await db.get(HighlightTable, highlight.id)
            if existing is None or existing.deleted_at is not None:
                raise ValueError("Highlight not found.")
            self._assign_highlight(existing, highlight)
            await db.commit()
            await db.refresh(existing)
            return self._to_highlight_record(existing)

    async def find_by_source(
        self, *, source_type: str, session_id: str | None, bundle_id: str | None
    ) -> HighlightRecord | None:
        statement = select(HighlightTable).where(
            HighlightTable.source_type == _source_type_to_db(source_type),
            HighlightTable.session_id == session_id,
            HighlightTable.bundle_id == bundle_id,
            HighlightTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_highlight_record(row) if row else None

    async def list_highlights(
        self,
        *,
        profile_id: str,
        visibility: str | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]:
        statement: Select[tuple[HighlightTable]] = (
            select(HighlightTable)
            .where(
                HighlightTable.profile_id == profile_id,
                HighlightTable.deleted_at.is_(None),
            )
            .order_by(HighlightTable.published_at.desc(), HighlightTable.id.desc())
        )
        if visibility is not None:
            statement = statement.where(
                HighlightTable.visibility == _visibility_to_db(visibility)
            )

        if cursor:
            cursor_published_at, cursor_id = _decode_cursor(cursor)
            statement = statement.where(
                or_(
                    HighlightTable.published_at < cursor_published_at,
                    and_(
                        HighlightTable.published_at == cursor_published_at,
                        HighlightTable.id < cursor_id,
                    ),
                )
            )

        async with self._session_factory() as db:
            rows = (await db.execute(statement.limit(limit + 1))).scalars().all()
            has_next = len(rows) > limit
            page_rows = rows[:limit]
            next_cursor = None
            if has_next and page_rows:
                last_item = page_rows[-1]
                next_cursor = _encode_cursor(last_item.published_at, last_item.id)
            return (
                [self._to_highlight_record(row) for row in page_rows],
                next_cursor,
                has_next,
            )

    async def count_highlights(self, *, profile_id: str, visibility: str | None) -> int:
        statement = select(func.count(HighlightTable.id)).where(
            HighlightTable.profile_id == profile_id,
            HighlightTable.deleted_at.is_(None),
        )
        if visibility is not None:
            statement = statement.where(
                HighlightTable.visibility == _visibility_to_db(visibility)
            )
        async with self._session_factory() as db:
            count = (await db.execute(statement)).scalar_one()
            return int(count)

    async def list_public_highlights(
        self,
        *,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[HighlightRecord], str | None, bool]:
        statement: Select[tuple[HighlightTable]] = (
            select(HighlightTable)
            .where(
                HighlightTable.visibility == VisibilityDBEnum.PUBLIC,
                HighlightTable.deleted_at.is_(None),
            )
            .order_by(HighlightTable.published_at.desc(), HighlightTable.id.desc())
        )

        if cursor:
            cursor_published_at, cursor_id = _decode_cursor(cursor)
            statement = statement.where(
                or_(
                    HighlightTable.published_at < cursor_published_at,
                    and_(
                        HighlightTable.published_at == cursor_published_at,
                        HighlightTable.id < cursor_id,
                    ),
                )
            )

        async with self._session_factory() as db:
            rows = (await db.execute(statement.limit(limit + 1))).scalars().all()
            has_next = len(rows) > limit
            page_rows = rows[:limit]
            next_cursor = None
            if has_next and page_rows:
                last_item = page_rows[-1]
                next_cursor = _encode_cursor(last_item.published_at, last_item.id)
            return (
                [self._to_highlight_record(row) for row in page_rows],
                next_cursor,
                has_next,
            )

    async def get_wave_items(self, *, limit: int) -> list[WaveItemRow]:
        _require_sqlalchemy()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = (
            select(
                HighlightTable.id,
                HighlightTable.title,
                HighlightTable.rendered_image_path,
                ProfileTable.handle,
                SessionTable.topic,
            )
            .join(ProfileTable, ProfileTable.id == HighlightTable.profile_id)
            .outerjoin(SessionTable, SessionTable.id == HighlightTable.session_id)
            .where(
                HighlightTable.visibility == VisibilityDBEnum.PUBLIC,
                HighlightTable.created_at >= cutoff,
                HighlightTable.deleted_at.is_(None),
            )
            .order_by(func.random())
            .limit(limit)
        )
        async with self._session_factory() as db:
            rows = (await db.execute(stmt)).all()
        return [
            WaveItemRow(
                highlight_id=row[0],
                title=row[1],
                rendered_image_path=row[2],
                author_handle=row[3],
                topic=row[4],
            )
            for row in rows
        ]

    def _build_highlight_table(self, highlight: HighlightRecord) -> HighlightTable:
        return HighlightTable(
            id=highlight.id,
            profile_id=highlight.profile_id,
            source_type=_source_type_to_db(highlight.source_type),
            session_id=highlight.session_id,
            bundle_id=highlight.bundle_id,
            title=highlight.title,
            caption=highlight.caption,
            rendered_image_path=highlight.rendered_image_path,
            source_photo_path=highlight.source_photo_path,
            template_code=highlight.template_code,
            visibility=_visibility_to_db(highlight.visibility),
            published_at=highlight.published_at,
            created_at=highlight.created_at,
            updated_at=highlight.updated_at,
            deleted_at=None,
        )

    def _assign_highlight(
        self, table: HighlightTable, highlight: HighlightRecord
    ) -> None:
        table.profile_id = highlight.profile_id
        table.source_type = _source_type_to_db(highlight.source_type)
        table.session_id = highlight.session_id
        table.bundle_id = highlight.bundle_id
        table.title = highlight.title
        table.caption = highlight.caption
        table.rendered_image_path = highlight.rendered_image_path
        table.source_photo_path = highlight.source_photo_path
        table.template_code = highlight.template_code
        table.visibility = _visibility_to_db(highlight.visibility)
        table.published_at = highlight.published_at
        table.created_at = highlight.created_at
        table.updated_at = highlight.updated_at

    def _to_highlight_record(self, table: HighlightTable) -> HighlightRecord:
        return HighlightRecord(
            id=table.id,
            profile_id=table.profile_id,
            source_type=_source_type_from_db(table.source_type),
            session_id=table.session_id,
            bundle_id=table.bundle_id,
            title=table.title,
            caption=table.caption,
            template_code=table.template_code,
            rendered_image_path=table.rendered_image_path,
            source_photo_path=table.source_photo_path,
            visibility=table.visibility.value,
            published_at=table.published_at,
            created_at=table.created_at,
            updated_at=table.updated_at,
        )


def _visibility_to_db(visibility: str) -> VisibilityDBEnum:
    _require_sqlalchemy()
    return VisibilityDBEnum(visibility)


def _source_type_to_db(source_type: str) -> HighlightSourceTypeDBEnum:
    _require_sqlalchemy()
    if source_type == "sessionBundle":
        return HighlightSourceTypeDBEnum.SESSION_BUNDLE
    return HighlightSourceTypeDBEnum(source_type)


def _source_type_from_db(source_type: HighlightSourceTypeDBEnum) -> str:
    _require_sqlalchemy()
    if source_type == HighlightSourceTypeDBEnum.SESSION_BUNDLE:
        return "sessionBundle"
    return source_type.value


def _require_sqlalchemy() -> None:
    if select is None or HighlightTable is None or func is None:
        raise RuntimeError("SQLAlchemy is required for postgres persistence.")
