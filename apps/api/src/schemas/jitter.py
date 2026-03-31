from __future__ import annotations

from typing import Literal

from pydantic import Field

from src.schemas.common import CamelModel

JitterMessageRole = Literal["user", "assistant"]


class JitterChatMessageItem(CamelModel):
    role: JitterMessageRole
    content: str = Field(min_length=1, max_length=4000)


class JitterChatRequest(CamelModel):
    messages: list[JitterChatMessageItem] = Field(min_length=1, max_length=20)
    context_summary: str | None = Field(default=None, max_length=8000)


class JitterChatResponse(CamelModel):
    reply: str
