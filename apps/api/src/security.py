from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import NAMESPACE_URL, uuid5

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from jose import jwt as jose_jwt

from src.config import Settings, get_settings
from src.exceptions import UnauthorizedError

logger = logging.getLogger("niche.security")

bearer_scheme = HTTPBearer(auto_error=False)

# JWKS는 앱 수명 동안 한 번만 가져온다.
# Supabase는 키를 자주 교체하지 않으므로 프로세스 재시작으로 갱신하면 충분하다.
_jwks_cache: dict | None = None


def _fetch_jwks(supabase_url: str) -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url, timeout=5.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        logger.info("event=jwks.loaded url=%s key_count=%s", jwks_url, len(_jwks_cache.get("keys", [])))
        return _jwks_cache
    except Exception as exc:
        logger.warning("event=jwks.fetch_failed url=%s reason=%s", jwks_url, exc)
        raise UnauthorizedError() from exc


@dataclass(slots=True)
class AuthenticatedUser:
    auth_user_id: str
    profile_id: str
    is_anonymous: bool = False


def _decode_jwt(token: str, key: object, algorithms: list[str]) -> dict:
    return jose_jwt.decode(token, key, algorithms=algorithms, audience="authenticated")


def _parse_bearer_token(token: str, settings: Settings) -> AuthenticatedUser:
    token_value = token.strip()
    if not token_value:
        raise UnauthorizedError()

    has_url = bool(settings.supabase_url)
    has_secret = bool(settings.supabase_jwt_secret)

    if not has_url and not has_secret:
        # dev fallback: 같은 토큰 문자열 = 같은 유저. 로컬 개발 전용.
        stable_user_id = str(uuid5(NAMESPACE_URL, f"niche-dev-user:{token_value}"))
        return AuthenticatedUser(auth_user_id=stable_user_id, profile_id=stable_user_id)

    payload: dict | None = None
    last_exc: Exception | None = None

    # 1단계: JWKS(ES256) 검증 — supabase_url이 있을 때
    if has_url:
        try:
            jwks = _fetch_jwks(settings.supabase_url)  # type: ignore[arg-type]
            payload = _decode_jwt(token_value, jwks, ["ES256"])
        except UnauthorizedError:
            raise
        except JWTError as exc:
            last_exc = exc
            logger.debug("event=jwt.es256_failed reason=%s", exc)

    # 2단계: HS256 fallback — supabase_jwt_secret이 있을 때 (구 토큰 대응)
    if payload is None and has_secret:
        try:
            payload = _decode_jwt(token_value, settings.supabase_jwt_secret, ["HS256"])
        except JWTError as exc:
            last_exc = exc
            logger.debug("event=jwt.hs256_failed reason=%s", exc)

    if payload is None:
        logger.warning("event=jwt.invalid reason=%s", last_exc)
        raise UnauthorizedError()

    auth_user_id = payload.get("sub")
    if not auth_user_id:
        logger.warning("event=jwt.invalid reason=missing_sub")
        raise UnauthorizedError()

    return AuthenticatedUser(auth_user_id=auth_user_id, profile_id=auth_user_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError()
    return _parse_bearer_token(credentials.credentials, settings)
