from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import uuid4

try:
    from sqlalchemy import Select, and_, or_, select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    from src.models.base import SessionStatusDBEnum, VisibilityDBEnum
    from src.models.session_tables import SessionNoteTable, SessionTable
except ModuleNotFoundError:  # pragma: no cover - exercised only in minimal local envs
    Select = Any
    AsyncSession = Any
    async_sessionmaker = Any
    and_ = None
    or_ = None
    select = None
    SessionStatusDBEnum = None
    VisibilityDBEnum = None
    SessionNoteTable = None
    SessionTable = None

from src.models.session import SessionRecord, SessionStatus
from src.models.session_note import SessionNoteRecord


class SessionRepository(Protocol):
    async def get_active_session(self, *, profile_id: str) -> SessionRecord | None: ...

    async def create_session(self, *, session: SessionRecord) -> SessionRecord: ...

    async def get_session(self, *, session_id: str) -> SessionRecord | None: ...

    async def update_session(self, *, session: SessionRecord) -> SessionRecord: ...

    async def list_sessions(
        self,
        *,
        profile_id: str,
        status: SessionStatus | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[SessionRecord], str | None, bool]: ...

    async def get_note(self, *, session_id: str) -> SessionNoteRecord | None: ...

    async def upsert_note(self, *, note: SessionNoteRecord) -> SessionNoteRecord: ...


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _encode_cursor(created_at: datetime, session_id: str) -> str:
    payload = json.dumps(
        {
            "createdAt": _normalize_timestamp(created_at).isoformat(),
            "id": session_id,
        }
    ).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("utf-8")


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8"))
        return datetime.fromisoformat(payload["createdAt"]), payload["id"]
    except Exception as exc:
        raise ValueError("Invalid cursor.") from exc


class InMemorySessionRepository:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._notes: dict[str, SessionNoteRecord] = {}

    async def get_active_session(self, *, profile_id: str) -> SessionRecord | None:
        for session in self._sessions.values():
            if session.profile_id == profile_id and session.status == "active":
                return session
        return None

    async def create_session(self, *, session: SessionRecord) -> SessionRecord:
        self._sessions[session.id] = session
        return session

    async def get_session(self, *, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    async def update_session(self, *, session: SessionRecord) -> SessionRecord:
        self._sessions[session.id] = session
        return session

    async def list_sessions(
        self,
        *,
        profile_id: str,
        status: SessionStatus | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[SessionRecord], str | None, bool]:
        sessions = [
            session
            for session in self._sessions.values()
            if session.profile_id == profile_id and (status is None or session.status == status)
        ]
        sessions.sort(key=lambda item: (_normalize_timestamp(item.created_at), item.id), reverse=True)

        if cursor:
            cursor_created_at, cursor_id = _decode_cursor(cursor)
            sessions = [
                session
                for session in sessions
                if (_normalize_timestamp(session.created_at), session.id) < (cursor_created_at, cursor_id)
            ]

        page = sessions[:limit]
        has_next = len(sessions) > limit
        next_cursor = None
        if has_next and page:
            last_item = page[-1]
            next_cursor = _encode_cursor(last_item.created_at, last_item.id)
        return page, next_cursor, has_next

    async def get_note(self, *, session_id: str) -> SessionNoteRecord | None:
        return self._notes.get(session_id)

    async def upsert_note(self, *, note: SessionNoteRecord) -> SessionNoteRecord:
        self._notes[note.session_id] = note
        return note


class PostgresSessionRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        _require_sqlalchemy()
        self._session_factory = session_factory

    async def get_active_session(self, *, profile_id: str) -> SessionRecord | None:
        statement = (
            select(SessionTable)
            .where(
                SessionTable.profile_id == profile_id,
                SessionTable.status == SessionStatusDBEnum.ACTIVE,
                SessionTable.deleted_at.is_(None),
            )
            .order_by(SessionTable.created_at.desc(), SessionTable.id.desc())
            .limit(1)
        )
        async with self._session_factory() as session:
            row = (await session.execute(statement)).scalar_one_or_none()
            return self._to_session_record(row) if row else None

    async def create_session(self, *, session: SessionRecord) -> SessionRecord:
        table = self._build_session_table(session)
        async with self._session_factory() as db:
            db.add(table)
            await db.commit()
            await db.refresh(table)
            return self._to_session_record(table)

    async def get_session(self, *, session_id: str) -> SessionRecord | None:
        statement = select(SessionTable).where(
            SessionTable.id == session_id,
            SessionTable.deleted_at.is_(None),
        )
        async with self._session_factory() as session:
            row = (await session.execute(statement)).scalar_one_or_none()
            return self._to_session_record(row) if row else None

    async def update_session(self, *, session: SessionRecord) -> SessionRecord:
        async with self._session_factory() as db:
            existing = await db.get(SessionTable, session.id)
            if existing is None or existing.deleted_at is not None:
                raise ValueError("Session not found.")
            self._assign_session(existing, session)
            await db.commit()
            await db.refresh(existing)
            return self._to_session_record(existing)

    async def list_sessions(
        self,
        *,
        profile_id: str,
        status: SessionStatus | None,
        cursor: str | None,
        limit: int,
    ) -> tuple[list[SessionRecord], str | None, bool]:
        statement: Select[tuple[SessionTable]] = (
            select(SessionTable)
            .where(
                SessionTable.profile_id == profile_id,
                SessionTable.deleted_at.is_(None),
            )
            .order_by(SessionTable.created_at.desc(), SessionTable.id.desc())
        )
        if status is not None:
            statement = statement.where(SessionTable.status == _status_to_db(status))

        if cursor:
            cursor_created_at, cursor_id = _decode_cursor(cursor)
            statement = statement.where(
                or_(
                    SessionTable.created_at < cursor_created_at,
                    and_(SessionTable.created_at == cursor_created_at, SessionTable.id < cursor_id),
                )
            )

        async with self._session_factory() as db:
            rows = (
                await db.execute(statement.limit(limit + 1))
            ).scalars().all()
            has_next = len(rows) > limit
            page_rows = rows[:limit]
            next_cursor = None
            if has_next and page_rows:
                last_item = page_rows[-1]
                next_cursor = _encode_cursor(last_item.created_at, last_item.id)
            return [self._to_session_record(row) for row in page_rows], next_cursor, has_next

    async def get_note(self, *, session_id: str) -> SessionNoteRecord | None:
        statement = select(SessionNoteTable).where(
            SessionNoteTable.session_id == session_id,
            SessionNoteTable.deleted_at.is_(None),
        )
        async with self._session_factory() as db:
            row = (await db.execute(statement)).scalar_one_or_none()
            return self._to_note_record(row) if row else None

    async def upsert_note(self, *, note: SessionNoteRecord) -> SessionNoteRecord:
        async with self._session_factory() as db:
            statement = select(SessionNoteTable).where(
                SessionNoteTable.session_id == note.session_id,
                SessionNoteTable.deleted_at.is_(None),
            )
            existing = (await db.execute(statement)).scalar_one_or_none()

            if existing is None:
                existing = SessionNoteTable(
                    id=str(uuid4()),
                    session_id=note.session_id,
                    profile_id=note.profile_id,
                    summary=note.summary,
                    insight=note.insight,
                    mood=note.mood,
                    tags=note.tags,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                    deleted_at=None,
                )
                db.add(existing)
            else:
                existing.profile_id = note.profile_id
                existing.summary = note.summary
                existing.insight = note.insight
                existing.mood = note.mood
                existing.tags = note.tags
                existing.updated_at = note.updated_at

            await db.commit()
            await db.refresh(existing)
            return self._to_note_record(existing)

    def _build_session_table(self, session: SessionRecord) -> SessionTable:
        return SessionTable(
            id=session.id,
            profile_id=session.profile_id,
            topic=session.topic,
            subject=session.subject,
            planned_minutes=session.planned_minutes,
            actual_minutes=session.actual_minutes,
            started_at=session.started_at,
            ended_at=session.ended_at,
            status=_status_to_db(session.status),
            visibility=_visibility_to_db(session.visibility),
            is_highlight_eligible=session.is_highlight_eligible,
            source=session.source,
            created_at=session.created_at,
            updated_at=session.updated_at,
            deleted_at=None,
        )

    def _assign_session(self, table: SessionTable, session: SessionRecord) -> None:
        table.profile_id = session.profile_id
        table.topic = session.topic
        table.subject = session.subject
        table.planned_minutes = session.planned_minutes
        table.actual_minutes = session.actual_minutes
        table.started_at = session.started_at
        table.ended_at = session.ended_at
        table.status = _status_to_db(session.status)
        table.visibility = _visibility_to_db(session.visibility)
        table.is_highlight_eligible = session.is_highlight_eligible
        table.source = session.source
        table.created_at = session.created_at
        table.updated_at = session.updated_at

    def _to_session_record(self, table: SessionTable) -> SessionRecord:
        return SessionRecord(
            id=table.id,
            profile_id=table.profile_id,
            topic=table.topic,
            subject=table.subject,
            planned_minutes=table.planned_minutes,
            actual_minutes=table.actual_minutes,
            started_at=table.started_at,
            ended_at=table.ended_at,
            status=table.status.value,
            visibility=table.visibility.value,
            source=table.source,
            is_highlight_eligible=table.is_highlight_eligible,
            created_at=table.created_at,
            updated_at=table.updated_at,
        )

    def _to_note_record(self, table: SessionNoteTable) -> SessionNoteRecord:
        return SessionNoteRecord(
            session_id=table.session_id,
            profile_id=table.profile_id,
            summary=table.summary,
            insight=table.insight,
            mood=table.mood,
            tags=list(table.tags or []),
            created_at=table.created_at,
            updated_at=table.updated_at,
        )


def _status_to_db(status: SessionStatus) -> SessionStatusDBEnum:
    _require_sqlalchemy()
    return SessionStatusDBEnum(status)


def _visibility_to_db(visibility: str) -> VisibilityDBEnum:
    _require_sqlalchemy()
    return VisibilityDBEnum(visibility)


def _require_sqlalchemy() -> None:
    if select is None or SessionTable is None or SessionNoteTable is None:
        raise RuntimeError("SQLAlchemy is required for postgres persistence.")
