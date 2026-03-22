from __future__ import annotations

import uuid

from src.config import Settings
from src.schemas.upload import ALLOWED_SCOPES, PresignResponse


class UploadService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def generate_presign(
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

        # Real Supabase Storage presign would call:
        # supabase.storage.from_(bucket).create_signed_upload_url(path)
        # For now return a stub upload URL using settings.storage_public_base_url.
        # When Supabase is connected, replace this stub with the real signed URL call.
        upload_url = f"{self._settings.storage_public_base_url}/{path}?token=stub"

        return PresignResponse(
            bucket=bucket,
            path=path,
            upload_url=upload_url,
            headers={"content-type": content_type},
            expires_in=300,
        )

    @staticmethod
    def _build_path(user_id: str, scope: str, temp_id: str, file_ext: str) -> str:
        scope_dirs = {
            "avatar": f"avatar/{user_id}/profile.{file_ext}",
            "blogCover": f"blog/{user_id}/{temp_id}/cover.{file_ext}",
            "highlightRendered": f"highlight/{user_id}/{temp_id}/rendered.{file_ext}",
            "highlightSourcePhoto": f"highlight/{user_id}/{temp_id}/source.{file_ext}",
        }
        return f"content/{scope_dirs[scope]}"
