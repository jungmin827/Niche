import uuid
from datetime import datetime, timezone
from typing import Mapping, Sequence

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.models.interest_table import InterestTable
from src.models.log_table import LogTable
from src.schemas.interest import InterestCreate, InterestUpdate
from src.schemas.log import LogCreate, LogUpdate

class InterestRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory

    async def create_interest(self, profile_id: str, data: InterestCreate) -> InterestTable:
        async with self.session_factory() as db:
            new_record = InterestTable(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                name=data.name,
                started_at=data.started_at,
                is_public=True
            )
            db.add(new_record)
            await db.commit()
            await db.refresh(new_record)
            return new_record

    async def get_by_id(self, interest_id: str) -> InterestTable | None:
        stmt = sa.select(InterestTable).where(
            InterestTable.id == interest_id, InterestTable.deleted_at.is_(None)
        )
        async with self.session_factory() as db:
            result = await db.execute(stmt)
            return result.scalars().first()

    async def list_by_profile_id(self, profile_id: str) -> Sequence[InterestTable]:
        stmt = sa.select(InterestTable).where(
            InterestTable.profile_id == profile_id, InterestTable.deleted_at.is_(None)
        ).order_by(InterestTable.created_at.desc())
        async with self.session_factory() as db:
            result = await db.execute(stmt)
            return result.scalars().all()

    async def count_logs_for_interest(self, interest_id: str) -> int:
        stmt = sa.select(sa.func.count(LogTable.id)).where(
             LogTable.interest_id == interest_id, LogTable.deleted_at.is_(None)
        )
        async with self.session_factory() as db:
            result = await db.execute(stmt)
            return result.scalar_one_or_none() or 0

    async def get_logs_for_interest(self, interest_id: str) -> Sequence[LogTable]:
        stmt = sa.select(LogTable).where(
             LogTable.interest_id == interest_id, LogTable.deleted_at.is_(None)
        ).order_by(LogTable.logged_at.desc())
        async with self.session_factory() as db:
            result = await db.execute(stmt)
            return result.scalars().all()

    async def update_interest(self, record: InterestTable, data: InterestUpdate) -> InterestTable:
        async with self.session_factory() as db:
            # Re-fetch or merge the detached record
            merged_record = await db.merge(record)
            if data.name is not None:
                merged_record.name = data.name
            if data.started_at is not None:
                merged_record.started_at = data.started_at
            
            merged_record.updated_at = sa.func.now()
            await db.commit()
            await db.refresh(merged_record)
            return merged_record

    async def delete_interest(self, record: InterestTable) -> None:
        async with self.session_factory() as db:
            merged_record = await db.merge(record)
            merged_record.deleted_at = sa.func.now()
            await db.commit()

    async def create_log(self, interest_id: str, data: LogCreate) -> LogTable:
        async with self.session_factory() as db:
            new_record = LogTable(
                id=str(uuid.uuid4()),
                interest_id=interest_id,
                text=data.text,
                tag=data.tag
            )
            db.add(new_record)
            await db.commit()
            await db.refresh(new_record)
            return new_record

    async def get_log_by_id(self, log_id: str) -> LogTable | None:
        stmt = sa.select(LogTable).where(
            LogTable.id == log_id, LogTable.deleted_at.is_(None)
        )
        async with self.session_factory() as db:
            result = await db.execute(stmt)
            return result.scalars().first()

    async def update_log(self, record: LogTable, data: LogUpdate) -> LogTable:
        async with self.session_factory() as db:
            merged_record = await db.merge(record)
            if data.text is not None:
                merged_record.text = data.text
            if data.tag is not None:
                merged_record.tag = data.tag
            
            merged_record.updated_at = sa.func.now()
            await db.commit()
            await db.refresh(merged_record)
            return merged_record

    async def delete_log(self, record: LogTable) -> None:
        async with self.session_factory() as db:
            merged_record = await db.merge(record)
            merged_record.deleted_at = sa.func.now()
            await db.commit()


class InMemoryInterestRepository:
    def __init__(self) -> None:
        self._interests: dict[str, InterestTable] = {}
        self._logs: dict[str, LogTable] = {}

    async def create_interest(self, profile_id: str, data: InterestCreate) -> InterestTable:
        now = datetime.now(timezone.utc)
        record = InterestTable(
            id=str(uuid.uuid4()),
            profile_id=profile_id,
            name=data.name,
            started_at=data.started_at,
            is_public=True,
            created_at=now,
            updated_at=now,
            deleted_at=None,
        )
        self._interests[record.id] = record
        return record

    async def get_by_id(self, interest_id: str) -> InterestTable | None:
        r = self._interests.get(interest_id)
        return r if r and r.deleted_at is None else None

    async def list_by_profile_id(self, profile_id: str) -> Sequence[InterestTable]:
        return [
            r for r in self._interests.values()
            if r.profile_id == profile_id and r.deleted_at is None
        ]

    async def count_logs_for_interest(self, interest_id: str) -> int:
        return sum(
            1 for l in self._logs.values()
            if l.interest_id == interest_id and l.deleted_at is None
        )

    async def get_logs_for_interest(self, interest_id: str) -> Sequence[LogTable]:
        return [
            l for l in self._logs.values()
            if l.interest_id == interest_id and l.deleted_at is None
        ]

    async def update_interest(self, record: InterestTable, data: InterestUpdate) -> InterestTable:
        r = self._interests[record.id]
        if data.name is not None:
            r.name = data.name
        if data.started_at is not None:
            r.started_at = data.started_at
        r.updated_at = datetime.now(timezone.utc)
        return r

    async def delete_interest(self, record: InterestTable) -> None:
        r = self._interests.get(record.id)
        if r:
            r.deleted_at = datetime.now(timezone.utc)

    async def create_log(self, interest_id: str, data: LogCreate) -> LogTable:
        now = datetime.now(timezone.utc)
        record = LogTable(
            id=str(uuid.uuid4()),
            interest_id=interest_id,
            text=data.text,
            tag=data.tag,
            logged_at=now,
            is_public=False,
            created_at=now,
            updated_at=now,
            deleted_at=None,
        )
        self._logs[record.id] = record
        return record

    async def get_log_by_id(self, log_id: str) -> LogTable | None:
        r = self._logs.get(log_id)
        return r if r and r.deleted_at is None else None

    async def update_log(self, record: LogTable, data: LogUpdate) -> LogTable:
        r = self._logs[record.id]
        if data.text is not None:
            r.text = data.text
        if data.tag is not None:
            r.tag = data.tag
        r.updated_at = datetime.now(timezone.utc)
        return r

    async def delete_log(self, record: LogTable) -> None:
        r = self._logs.get(record.id)
        if r:
            r.deleted_at = datetime.now(timezone.utc)
