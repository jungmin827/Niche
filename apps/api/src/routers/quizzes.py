from __future__ import annotations

from fastapi import APIRouter, Depends, status

from src.ai.base import AIProvider
from src.dependencies.repositories import get_ai_provider, get_profile_repo, get_quiz_repository, get_session_repository
from src.repositories.profile_repo import ProfileRepository
from src.repositories.quiz_job_repo import QuizRepository
from src.repositories.session_repo import SessionRepository
from src.services.rank_service import RankService
from src.schemas.quiz import (
    QuizAttemptCreateRequest,
    QuizAttemptDetailDTO,
    QuizAttemptResponse,
    QuizJobCreateRequest,
    QuizJobResponse,
    QuizResponse,
    SessionQuizResultResponse,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.quiz_service import QuizService

router = APIRouter(prefix="/v1", tags=["quizzes"])


def get_quiz_service(
    quiz_repository: QuizRepository = Depends(get_quiz_repository),
    session_repository: SessionRepository = Depends(get_session_repository),
    ai_provider: AIProvider = Depends(get_ai_provider),
    profile_repo: ProfileRepository = Depends(get_profile_repo),
) -> QuizService:
    rank_service = RankService(repo=profile_repo)
    return QuizService(
        quiz_repository=quiz_repository,
        session_repository=session_repository,
        ai_provider=ai_provider,
        rank_service=rank_service,
    )


@router.get("/sessions/{session_id}/quiz-result", response_model=SessionQuizResultResponse)
async def get_session_quiz_result(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> SessionQuizResultResponse:
    score = await service.get_session_quiz_score(session_id)
    return SessionQuizResultResponse(total_score=score)


@router.post("/quizzes/jobs", response_model=QuizJobResponse, status_code=status.HTTP_202_ACCEPTED)
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


@router.get("/quizzes/{quiz_id}/attempts/{attempt_id}", response_model=QuizAttemptDetailDTO)
async def get_quiz_attempt(
    quiz_id: str,
    attempt_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizAttemptDetailDTO:
    return await service.get_attempt(
        current_user=current_user,
        quiz_id=quiz_id,
        attempt_id=attempt_id,
    )


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
