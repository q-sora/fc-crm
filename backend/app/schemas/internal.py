from datetime import datetime
from pydantic import BaseModel
from app.models.internal_chat import InternalChatType
from app.models.internal_message import InternalMessageType


class InternalChatCreate(BaseModel):
    type: InternalChatType = InternalChatType.direct
    name: str | None = None          # required for group chats
    member_ids: list[int]            # user ids to add (excluding self)


class MemberShort(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class FileShort(BaseModel):
    id: int
    original_name: str
    mime_type: str
    url: str
    model_config = {"from_attributes": True}


class InternalMessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int | None
    sender_name: str | None
    content: str | None
    message_type: InternalMessageType
    file: FileShort | None
    is_forwarded: bool = False
    sent_at: datetime
    model_config = {"from_attributes": True}


class InternalChatResponse(BaseModel):
    id: int
    type: InternalChatType
    name: str | None
    members: list[MemberShort]
    created_at: datetime
    model_config = {"from_attributes": True}


class SendInternalMessageRequest(BaseModel):
    content: str | None = None
    file_id: int | None = None
    is_forwarded: bool = False
