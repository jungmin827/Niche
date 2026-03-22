from __future__ import annotations

import logging
import time
from contextvars import ContextVar
from uuid import uuid4

from fastapi import Request

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)
logger = logging.getLogger("niche.request")


def get_request_id() -> str | None:
    return request_id_context.get()


async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    token = request_id_context.set(request_id)
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "request_id=%s method=%s path=%s duration_ms=%s backend=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
            getattr(request.app.state, "repository_backend", "unknown"),
        )
        request_id_context.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "request_id=%s method=%s path=%s duration_ms=%s backend=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
            getattr(request.app.state, "repository_backend", "unknown"),
        )
        request_id_context.reset(token)
        raise
