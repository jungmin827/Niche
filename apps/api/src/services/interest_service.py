import math
from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException
from starlette import status

from src import error_codes
from src.exceptions import AppError
from src.models.interest_table import InterestTable
from src.models.log_table import LogTable
from src.repositories.interest_repo import InterestRepository
from src.schemas.interest import InterestCreate, InterestResponse, InterestUpdate
from src.schemas.log import LogCreate, LogResponse, LogUpdate


class InterestService:
    def __init__(self, repo: InterestRepository):
        self.repo = repo

    def _calculate_depth_score(self, started_at, record_count: int) -> float | None:
        if record_count == 0:
            return None
        today = datetime.now(timezone.utc).date()
        days_since_start = max(0, (today - started_at).days)
        score = math.log10(days_since_start + 1) * math.log10(record_count + 2)
        return round(score, 1)

    def _to_interest_response(self, record: InterestTable, record_count: int) -> InterestResponse:
        depth_score = self._calculate_depth_score(record.started_at, record_count)
        return InterestResponse(
            id=record.id,
            name=record.name,
            started_at=record.started_at,
            record_count=record_count,
            depth_score=depth_score,
            is_public=record.is_public,
            created_at=record.created_at
        )

    def _to_log_response(self, record: LogTable) -> LogResponse:
        return LogResponse(
            id=record.id,
            interest_id=record.interest_id,
            text=record.text,
            tag=record.tag,
            logged_at=record.logged_at,
            is_public=record.is_public,
            created_at=record.created_at
        )

    async def create_interest(self, profile_id: str, data: InterestCreate) -> InterestResponse:
        record = await self.repo.create_interest(profile_id, data)
        return self._to_interest_response(record, 0)

    async def get_my_interests(self, profile_id: str) -> dict:
        records = await self.repo.list_by_profile_id(profile_id)
        
        items = []
        for r in records:
            count = await self.repo.count_logs_for_interest(r.id)
            items.append(self._to_interest_response(r, count))
            
        return {"items": items}

    async def get_interest_detail(self, request_profile_id: str, interest_id: str) -> dict:
        record = await self.repo.get_by_id(interest_id)
        if not record:
            raise AppError(
                status_code=status.HTTP_404_NOT_FOUND,
                code=error_codes.NOT_FOUND,
                message="Interest not found."
            )
        
        if record.profile_id != request_profile_id and not record.is_public:
            raise AppError(
                status_code=status.HTTP_403_FORBIDDEN,
                code=error_codes.FORBIDDEN,
                message="Access denied."
            )

        count = await self.repo.count_logs_for_interest(interest_id)
        interest_resp = self._to_interest_response(record, count)
        
        log_records = await self.repo.get_logs_for_interest(interest_id)
        logs = [self._to_log_response(l) for l in log_records]
        
        return {
            "interest": interest_resp,
            "logs": logs
        }

    async def update_interest(self, profile_id: str, interest_id: str, data: InterestUpdate) -> InterestResponse:
        record = await self.repo.get_by_id(interest_id)
        if not record or record.profile_id != profile_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Interest not found.")
            
        updated = await self.repo.update_interest(record, data)
        count = await self.repo.count_logs_for_interest(interest_id)
        return self._to_interest_response(updated, count)

    async def delete_interest(self, profile_id: str, interest_id: str) -> None:
        record = await self.repo.get_by_id(interest_id)
        if not record or record.profile_id != profile_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Interest not found.")
            
        logs = await self.repo.get_logs_for_interest(interest_id)
        for log_record in logs:
            await self.repo.delete_log(log_record)
            
        await self.repo.delete_interest(record)

    async def create_log(self, profile_id: str, interest_id: str, data: LogCreate) -> dict:
        record = await self.repo.get_by_id(interest_id)
        if not record or record.profile_id != profile_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Interest not found.")
            
        log_record = await self.repo.create_log(interest_id, data)
        count = await self.repo.count_logs_for_interest(interest_id)
        interest_resp = self._to_interest_response(record, count)
        
        return {
            "interest": interest_resp,
            "log": self._to_log_response(log_record)
        }

    async def update_log(self, profile_id: str, interest_id: str, log_id: str, data: LogUpdate) -> dict:
        record = await self.repo.get_by_id(interest_id)
        if not record or record.profile_id != profile_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Interest not found.")
            
        log_record = await self.repo.get_log_by_id(log_id)
        if not log_record or log_record.interest_id != interest_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Log not found.")
            
        updated_log = await self.repo.update_log(log_record, data)
        count = await self.repo.count_logs_for_interest(interest_id)
        
        return {
            "interest": self._to_interest_response(record, count),
            "log": self._to_log_response(updated_log)
        }

    async def delete_log(self, profile_id: str, interest_id: str, log_id: str) -> dict:
        record = await self.repo.get_by_id(interest_id)
        if not record or record.profile_id != profile_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Interest not found.")
            
        log_record = await self.repo.get_log_by_id(log_id)
        if not log_record or log_record.interest_id != interest_id:
            raise AppError(status.HTTP_404_NOT_FOUND, error_codes.NOT_FOUND, "Log not found.")
            
        await self.repo.delete_log(log_record)
        count = await self.repo.count_logs_for_interest(interest_id)
        
        return {
            "interest": self._to_interest_response(record, count)
        }
