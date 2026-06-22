from datetime import datetime
from pydantic import BaseModel


class OrganizationCreate(BaseModel):
    name: str


class OrganizationResponse(BaseModel):
    id: int
    name: str
    aliases: list[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}
