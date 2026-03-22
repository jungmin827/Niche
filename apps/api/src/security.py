from __future__ import annotations

from dataclasses import dataclass
from uuid import NAMESPACE_URL, uuid5

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import Settings, get_settings
from src.exceptions import UnauthorizedError

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class AuthenticatedUser:
    auth_user_id: str
    profile_id: str
    is_anonymous: bool = False


def _parse_bearer_token(token: str, settings: Settings) -> AuthenticatedUser:
    # TODO: Verify Supabase JWTs with the configured secret instead of trusting the bearer token value.
    token_value = token.strip()
    if not token_value:
        raise UnauthorizedError()
    if settings.supabase_jwt_secret:
        raise UnauthorizedError("Supabase JWT verification is not implemented yet.")
    stable_user_id = str(uuid5(NAMESPACE_URL, f"niche-dev-user:{token_value}"))
    return AuthenticatedUser(auth_user_id=stable_user_id, profile_id=stable_user_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError()
    return _parse_bearer_token(credentials.credentials, settings)
