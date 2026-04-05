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
        """Supabase Storage에 signed upload URL을 요청한다.

        Supabase signed upload API: POST /storage/v1/object/upload/sign/{bucket}/{object_path}
        - path는 "content/highlight/..." 처럼 버킷 prefix를 포함하므로, 버킷 segment를 제거해 object_path를 만든다.
        - 응답의 "url" 필드는 상대 경로(/object/upload/sign/...)이므로 supabase_url + /storage/v1 prefix를 붙여 완성한다.
        - 에러는 STORAGE_UNAVAILABLE 코드로 503을 반환해 클라이언트가 재시도 여부를 판단할 수 있게 한다.
        """
        # path: "content/highlight/{user_id}/{uuid}/rendered.png"
        # → object_path: "highlight/{user_id}/{uuid}/rendered.png"  (버킷명 제거)
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
            # Supabase Storage가 10초 내 응답하지 않은 경우
            logger.error(
                "event=storage.presign.timeout bucket=%s path=%s", bucket, path
            )
            raise ServiceUnavailableAppError(
                "Storage service timed out. Please try again.",
                code=error_codes.STORAGE_UNAVAILABLE,
            )
        except httpx.HTTPStatusError as exc:
            # Supabase가 4xx/5xx를 반환한 경우 (잘못된 키, 버킷 미존재 등)
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
            # DNS 실패, 연결 거부 등 네트워크 수준 오류
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

        signed_path = response.json()["url"]  # 상대 경로: /object/upload/sign/...
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
