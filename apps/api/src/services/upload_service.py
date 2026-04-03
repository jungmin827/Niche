from __future__ import annotations

import logging
import uuid

import httpx

from src import error_codes
from src.config import Settings
from src.exceptions import ServiceUnavailableAppError
from src.schemas.upload import ALLOWED_SCOPES, PresignResponse

logger = logging.getLogger("niche.upload")


class UploadService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate_presign(
        self,
        user_id: str,
        bucket: str,
        scope: str,
        content_type: str,
        file_ext: str,
    ) -> PresignResponse:
        if scope not in ALLOWED_SCOPES:
            raise ValueError(f"Unknown scope: {scope}")

        temp_id = str(uuid.uuid4())
        path = self._build_path(user_id, scope, temp_id, file_ext)

        if self._settings.supabase_url and self._settings.supabase_service_role_key:
            upload_url = await self._create_signed_upload_url(
                bucket=bucket,
                path=path,
                content_type=content_type,
            )
        else:
            logger.warning(
                "supabase_service_role_key not set — returning stub upload URL for path=%s", path
            )
            upload_url = f"{self._settings.storage_public_base_url}/{path}?token=stub"

        return PresignResponse(
            bucket=bucket,
            path=path,
            upload_url=upload_url,
            headers={"content-type": content_type},
            expires_in=300,
        )

    async def _create_signed_upload_url(
        self, *, bucket: str, path: str, content_type: str
    ) -> str:
        # path already includes bucket prefix (e.g. "content/highlight/...")
        # Supabase signed upload endpoint uses the object path without the bucket prefix.
        object_path = path.removeprefix(f"{bucket}/")
        url = f"{self._settings.supabase_url}/storage/v1/object/upload/sign/{bucket}/{object_path}"
        headers = {
            "Authorization": f"Bearer {self._settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(url, headers=headers, json={})
                response.raise_for_status()
        except httpx.TimeoutException:
            logger.error(
                "event=storage.presign.timeout bucket=%s path=%s", bucket, path
            )
            raise ServiceUnavailableAppError(
                "Storage service timed out. Please try again.",
                code=error_codes.STORAGE_UNAVAILABLE,
            )
        except httpx.HTTPStatusError as exc:
            logger.error(
                "event=storage.presign.http_error bucket=%s path=%s status=%s body=%s",
                bucket,
                path,
                exc.response.status_code,
                exc.response.text,
            )
            raise ServiceUnavailableAppError(
                "Storage service returned an error. Please try again.",
                code=error_codes.STORAGE_UNAVAILABLE,
                details={"storageStatus": exc.response.status_code},
            )
        except httpx.RequestError as exc:
            logger.error(
                "event=storage.presign.request_error bucket=%s path=%s error=%s",
                bucket,
                path,
                str(exc),
            )
            raise ServiceUnavailableAppError(
                "Storage service is unreachable. Please try again.",
                code=error_codes.STORAGE_UNAVAILABLE,
            )

        signed_path = response.json()["url"]  # relative: /object/upload/sign/...
        return f"{self._settings.supabase_url}/storage/v1{signed_path}"

    @staticmethod
    def _build_path(user_id: str, scope: str, temp_id: str, file_ext: str) -> str:
        scope_dirs = {
            "avatar": f"avatar/{user_id}/profile.{file_ext}",
            "blogCover": f"blog/{user_id}/{temp_id}/cover.{file_ext}",
            "highlightRendered": f"highlight/{user_id}/{temp_id}/rendered.{file_ext}",
            "highlightSourcePhoto": f"highlight/{user_id}/{temp_id}/source.{file_ext}",
        }
        return f"content/{scope_dirs[scope]}"
