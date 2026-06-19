from datetime import datetime
from pydantic import BaseModel


class FileResponse(BaseModel):
    id: int
    original_name: str
    mime_type: str
    size: int
    url: str
    created_at: datetime
    model_config = {"from_attributes": True}
