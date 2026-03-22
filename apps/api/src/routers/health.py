from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from src.config import Settings, get_settings
from src.db import check_readiness

router = APIRouter(tags=["infra"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(settings: Settings = Depends(get_settings)) -> JSONResponse:
    is_ready = await check_readiness(settings)
    payload = {"status": "ready" if is_ready else "not_ready"}
    response_status = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=response_status, content=payload)
