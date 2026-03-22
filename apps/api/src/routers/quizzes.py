from __future__ import annotations

from fastapi import APIRouter, Depends, status

from src.dependencies.repositories import get_quiz_repository, get_session_repository
from src.repositories.quiz_job_repo import QuizRepository
from src.repositories.session_repo import SessionRepository
from src.schemas.quiz import (
    QuizAttemptCreateRequest,
    QuizAttemptResponse,
    QuizJobCreateRequest,
    QuizJobResponse,
    QuizResponse,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.quiz_service import QuizService

router = APIRouter(prefix="/v1", tags=["quizzes"])


def get_quiz_service(
    quiz_repository: QuizRepository = Depends(get_quiz_repository),
    session_repository: SessionRepository = Depends(get_session_repository),
) -> QuizService:
    return QuizService(
        quiz_repository=quiz_repository,
        session_repository=session_repository,
    )


@router.post("/quizzes/jobs", response_model=QuizJobResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz_job(
    payload: QuizJobCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizJobResponse:
    return await service.create_job(current_user=current_user, payload=payload)


@router.get("/quizzes/jobs/{job_id}", response_model=QuizJobResponse)
async def get_quiz_job(
    job_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizJobResponse:
    return await service.get_job(current_user=current_user, job_id=job_id)


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizResponse:
    return await service.get_quiz(current_user=current_user, quiz_id=quiz_id)


@router.post(
    "/quizzes/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_quiz_attempt(
    quiz_id: str,
    payload: QuizAttemptCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizAttemptResponse:
    return await service.submit_attempt(
        current_user=current_user,
        quiz_id=quiz_id,
        payload=payload,
    )
