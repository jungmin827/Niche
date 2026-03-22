from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ALLOWED_SCOPES = {"avatar", "blogCover", "highlightRendered", "highlightSourcePhoto"}


class PresignRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    bucket: str
    scope: str
    content_type: str
    file_ext: str


class PresignResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    bucket: str
    path: str
    upload_url: str = Field(alias="uploadUrl")
    headers: dict[str, str]
    expires_in: int = Field(300, alias="expiresIn")
