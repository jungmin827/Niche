import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src import error_codes
from src.config import get_settings
from src.exceptions import AppError
from src.middleware.request_id import request_id_middleware
from src.routers import (
    archive,
    blog_posts,
    feed,
    health,
    highlights,
    jitter,
    profiles,
    quizzes,
    session_bundles,
    sessions,
    uploads,
)
from src.schemas.common import ErrorDetail, ErrorResponse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("niche.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name, version=settings.api_version, lifespan=lifespan
    )
    app.state.repository_backend = settings.session_repository_backend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_allow_origins),
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.middleware("http")(request_id_middleware)

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        payload = ErrorResponse(
            error=ErrorDetail(code=exc.code, message=exc.message, details=exc.details)
        )
        return JSONResponse(
            status_code=exc.status_code, content=payload.model_dump(by_alias=True)
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        error_details = jsonable_encoder(
            exc.errors(),
            custom_encoder={Exception: lambda value: str(value)},
        )
        logger.warning(
            "request_id=%s validation_error path=%s error_count=%s",
            getattr(request.state, "request_id", None),
            request.url.path,
            len(error_details),
        )
        payload = ErrorResponse(
            error=ErrorDetail(
                code=error_codes.VALIDATION_ERROR,
                message="Request validation failed.",
                details={"errors": error_details},
            )
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=payload.model_dump(by_alias=True),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "request_id=%s unhandled_error path=%s",
            getattr(request.state, "request_id", None),
            request.url.path,
            exc_info=exc,
        )
        payload = ErrorResponse(
            error=ErrorDetail(
                code=error_codes.INTERNAL_ERROR,
                message="Request could not be completed.",
                details=None,
            )
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=payload.model_dump(by_alias=True),
        )

    app.include_router(health.router)
    app.include_router(profiles.router)
    app.include_router(sessions.router)
    app.include_router(highlights.router)
    app.include_router(archive.router)
    app.include_router(feed.router)
    app.include_router(quizzes.router)
    app.include_router(session_bundles.router)
    app.include_router(blog_posts.router)
    app.include_router(uploads.router)
    app.include_router(jitter.router)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": settings.api_version}

    return app


app = create_app()
