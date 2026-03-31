from __future__ import annotations

import logging

from src.ai.base import AIProvider, JitterChatTurn
from src.exceptions import ServiceUnavailableAppError, ValidationAppError
from src.middleware.request_id import get_request_id
from src.schemas.jitter import JitterChatMessageItem, JitterChatRequest, JitterChatResponse

logger = logging.getLogger("niche.jitter")


def _validate_turn_order(messages: list[JitterChatMessageItem]) -> None:
    """Ensure alternating user/assistant starting and ending with user."""
    if not messages:
        raise ValidationAppError("messages must not be empty.")
    if messages[0].role != "user":
        raise ValidationAppError("The first message must be from the user.")
    if messages[-1].role != "user":
        raise ValidationAppError("The last message must be from the user.")
    for i in range(len(messages) - 1):
        cur, nxt = messages[i].role, messages[i + 1].role
        if cur == nxt:
            raise ValidationAppError(
                "Messages must alternate between user and assistant.",
                details={"index": i},
            )


class JitterService:
    def __init__(self, *, ai_provider: AIProvider) -> None:
        self._ai_provider = ai_provider

    async def chat(
        self,
        *,
        payload: JitterChatRequest,
    ) -> JitterChatResponse:
        _validate_turn_order(payload.messages)

        for m in payload.messages:
            if not m.content.strip():
                raise ValidationAppError(
                    "Each message must contain non-whitespace content.",
                )

        turns = [
            JitterChatTurn(role=m.role, content=m.content.strip()) for m in payload.messages
        ]

        try:
            reply = await self._ai_provider.jitter_chat(
                messages=turns,
                context_summary=payload.context_summary,
            )
        except RuntimeError as exc:
            logger.exception(
                "request_id=%s event=jitter.chat_failed reason=%s",
                get_request_id(),
                exc,
            )
            raise ServiceUnavailableAppError(
                "Jitter is temporarily unavailable. Please try again later.",
            ) from exc

        reply = reply.strip()
        if not reply:
            logger.warning(
                "request_id=%s event=jitter.empty_reply",
                get_request_id(),
            )
            raise ServiceUnavailableAppError(
                "The assistant could not produce a reply. Please try again.",
            )

        return JitterChatResponse(reply=reply)
