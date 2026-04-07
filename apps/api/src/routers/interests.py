from fastapi import APIRouter, Depends

from src.dependencies.repositories import get_interest_service
from src.schemas.interest import InterestCreate, InterestResponse, InterestUpdate
from src.schemas.log import LogCreate, LogUpdate
from src.security import AuthenticatedUser, get_current_user
from src.services.interest_service import InterestService

router = APIRouter(prefix="/v1", tags=["interests"])


@router.post("/interests", response_model=InterestResponse, status_code=201)
async def create_interest(
    payload: InterestCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.create_interest(current_user.profile_id, payload)


@router.get("/me/interests", response_model=dict)
async def get_my_interests(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.get_my_interests(current_user.profile_id)


@router.get("/interests/{interest_id}", response_model=dict)
async def get_interest_detail(
    interest_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.get_interest_detail(current_user.profile_id, interest_id)


@router.patch("/interests/{interest_id}", response_model=InterestResponse)
async def update_interest(
    interest_id: str,
    payload: InterestUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.update_interest(current_user.profile_id, interest_id, payload)


@router.delete("/interests/{interest_id}", status_code=204)
async def delete_interest(
    interest_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    await service.delete_interest(current_user.profile_id, interest_id)


@router.post("/interests/{interest_id}/logs", response_model=dict, status_code=201)
async def create_log(
    interest_id: str,
    payload: LogCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.create_log(current_user.profile_id, interest_id, payload)


@router.patch("/interests/{interest_id}/logs/{log_id}", response_model=dict)
async def update_log(
    interest_id: str,
    log_id: str,
    payload: LogUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.update_log(current_user.profile_id, interest_id, log_id, payload)


@router.delete("/interests/{interest_id}/logs/{log_id}", response_model=dict)
async def delete_log(
    interest_id: str,
    log_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: InterestService = Depends(get_interest_service),
):
    return await service.delete_log(current_user.profile_id, interest_id, log_id)
