from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from src.config import Settings, get_settings
from src.dependencies.repositories import get_session_repository
from src.repositories.session_repo import SessionRepository
from src.schemas.session import (
    SessionCompleteRequest,
    SessionCreateRequest,
    SessionDetailResponse,
    SessionListResponse,
    SessionNotePayload,
    SessionNoteResponse,
    SessionResponse,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.session_service import SessionService

router = APIRouter(prefix="/v1", tags=["sessions"])


def get_session_service(
    settings: Settings = Depends(get_settings),
    repository: SessionRepository = Depends(get_session_repository),
) -> SessionService:
    return SessionService(repository=repository, settings=settings)


@router.post(
    "/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED
)
async def create_session(
    payload: SessionCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    return await service.create_session(current_user=current_user, payload=payload)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionDetailResponse:
    return await service.get_session(current_user=current_user, session_id=session_id)


@router.post("/sessions/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: str,
    payload: SessionCompleteRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    return await service.complete_session(
        current_user=current_user,
        session_id=session_id,
        payload=payload,
    )


@router.post("/sessions/{session_id}/cancel", response_model=SessionResponse)
async def cancel_session(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    return await service.cancel_session(
        current_user=current_user, session_id=session_id
    )


@router.get("/me/sessions", response_model=SessionListResponse)
async def list_my_sessions(
    status_filter: Literal["active", "completed", "cancelled"] | None = Query(
        default=None,
        alias="status",
    ),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionListResponse:
    return await service.list_sessions(
        current_user=current_user,
        status=status_filter,
        cursor=cursor,
        limit=limit,
    )


@router.put("/sessions/{session_id}/note", response_model=SessionNoteResponse)
async def upsert_session_note(
    session_id: str,
    payload: SessionNotePayload,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionNoteResponse:
    return await service.upsert_note(
        current_user=current_user,
        session_id=session_id,
        payload=payload,
    )


@router.get("/sessions/{session_id}/note", response_model=SessionNoteResponse)
async def get_session_note(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionService = Depends(get_session_service),
) -> SessionNoteResponse:
    return await service.get_note(current_user=current_user, session_id=session_id)
