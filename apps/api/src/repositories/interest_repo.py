import uuid
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
