from __future__ import annotations

from fastapi import APIRouter, Depends, status

from src.dependencies.repositories import get_ai_provider
from src.ai.base import AIProvider
from src.schemas.jitter import JitterChatRequest, JitterChatResponse
from src.security import AuthenticatedUser, get_current_user
from src.services.jitter_service import JitterService

router = APIRouter(prefix="/v1", tags=["jitter"])


def get_jitter_service(
    ai_provider: AIProvider = Depends(get_ai_provider),
) -> JitterService:
    return JitterService(ai_provider=ai_provider)


@router.post(
    "/jitter/messages",
    response_model=JitterChatResponse,
    status_code=status.HTTP_200_OK,
)
async def post_jitter_message(
    payload: JitterChatRequest,
    _: AuthenticatedUser = Depends(get_current_user),
    service: JitterService = Depends(get_jitter_service),
) -> JitterChatResponse:
    return await service.chat(payload=payload)
