from datetime import datetime
from pydantic import BaseModel


class QuickPhraseCreate(BaseModel):
    title: str
    body: str


class QuickPhraseResponse(BaseModel):
    id: int
    title: str
    body: str
    created_by: int | None
    created_at: datetime
    model_config = {"from_attributes": True}
