from datetime import date, datetime
from pydantic import Field, field_validator

from src.schemas.common import CamelModel


class InterestCreate(CamelModel):
    name: str
    started_at: date

    @field_validator("started_at")
    @classmethod
    def started_at_must_not_be_future(cls, v: date) -> date:
        from datetime import date as _date
        if v > _date.today():
            raise ValueError("startedAt must not be a future date")
        return v


class InterestUpdate(CamelModel):
    name: str | None = None
    started_at: date | None = None

    @field_validator("started_at")
    @classmethod
    def started_at_must_not_be_future(cls, v: date | None) -> date | None:
        if v is None:
            return v
        from datetime import date as _date
        if v > _date.today():
            raise ValueError("startedAt must not be a future date")
        return v


class InterestResponse(CamelModel):
    id: str
    name: str
    started_at: date
    record_count: int = 0
    depth_score: float | None = None
    is_public: bool
    created_at: datetime


class InterestListResponse(CamelModel):
    items: list[InterestResponse]


# Compound responses — import LogResponse here (log.py has no dependency on interest.py)
from src.schemas.log import LogResponse  # noqa: E402


class InterestWithLogsResponse(CamelModel):
    interest: InterestResponse
    logs: list[LogResponse]


class InterestAndLogResponse(CamelModel):
    interest: InterestResponse
    log: LogResponse


class InterestOnlyResponse(CamelModel):
    interest: InterestResponse
