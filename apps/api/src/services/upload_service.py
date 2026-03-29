from __future__ import annotations

import logging
import uuid

import httpx

from src.config import Settings
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
        # Strip the leading bucket segment from path.
        object_path = path.removeprefix(f"{bucket}/")
        url = f"{self._settings.supabase_url}/storage/v1/object/upload/sign/{bucket}/{object_path}"
        headers = {
            "Authorization": f"Bearer {self._settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, headers=headers, json={})
            response.raise_for_status()
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
