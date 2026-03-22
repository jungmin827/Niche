from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ErrorDetail(CamelModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(CamelModel):
    error: ErrorDetail


ItemT = TypeVar("ItemT")


class PageResponse(CamelModel, Generic[ItemT]):
    items: list[ItemT]
    next_cursor: str | None
    has_next: bool
