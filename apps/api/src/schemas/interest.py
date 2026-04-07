from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class InterestCreate(BaseModel):
    name: str
    started_at: date

class InterestUpdate(BaseModel):
    name: str | None = None
    started_at: date | None = None

class InterestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    name: str
    started_at: date
    record_count: int = 0
    depth_score: float = 0.0
    is_public: bool
    created_at: datetime
