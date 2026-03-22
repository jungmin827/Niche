from __future__ import annotations

from fastapi import APIRouter, Depends, status

from src.dependencies.repositories import get_session_bundle_repository
from src.repositories.session_bundle_repo import SessionBundleRepository
from src.schemas.session_bundle import CreateSessionBundleRequest, SessionBundleResponse
from src.security import AuthenticatedUser, get_current_user
from src.services.session_bundle_service import SessionBundleService

router = APIRouter(prefix="/v1", tags=["session-bundles"])


def get_session_bundle_service(
    repository: SessionBundleRepository = Depends(get_session_bundle_repository),
) -> SessionBundleService:
    return SessionBundleService(repository=repository)


@router.post(
    "/session-bundles",
    response_model=SessionBundleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_bundle(
    payload: CreateSessionBundleRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionBundleService = Depends(get_session_bundle_service),
) -> SessionBundleResponse:
    return await service.create(current_user=current_user, payload=payload)


@router.get("/session-bundles/{bundle_id}", response_model=SessionBundleResponse)
async def get_session_bundle(
    bundle_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: SessionBundleService = Depends(get_session_bundle_service),
) -> SessionBundleResponse:
    return await service.get(current_user=current_user, bundle_id=bundle_id)
