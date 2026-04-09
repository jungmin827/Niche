from datetime import datetime
from pydantic import Field, field_validator

from src.models.base import LogTagDBEnum
from src.schemas.common import CamelModel


class LogCreate(CamelModel):
    text: str = Field(min_length=1, max_length=2000)
    tag: LogTagDBEnum

    @field_validator("text")
    @classmethod
    def text_must_not_be_whitespace_only(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be whitespace only")
        return v


class LogUpdate(CamelModel):
    text: str | None = Field(default=None, min_length=1, max_length=2000)
    tag: LogTagDBEnum | None = None

    @field_validator("text")
    @classmethod
    def text_must_not_be_whitespace_only(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("text must not be whitespace only")
        return v


class LogResponse(CamelModel):
    id: str
    interest_id: str
    text: str
    tag: LogTagDBEnum
    logged_at: datetime
    is_public: bool
    created_at: datetime
