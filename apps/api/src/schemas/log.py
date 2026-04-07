from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.base import LogTagDBEnum

class LogCreate(BaseModel):
    text: str
    tag: LogTagDBEnum

class LogUpdate(BaseModel):
    text: str | None = None
    tag: LogTagDBEnum | None = None

class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    interest_id: str
    text: str
    tag: LogTagDBEnum
    logged_at: datetime
    is_public: bool
    created_at: datetime
