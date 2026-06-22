from datetime import datetime
from pydantic import BaseModel
from app.models.client_profile import Channel
from app.models.external_chat import ChatStatus
from app.models.external_message import MessageDirection, MessageType


class OrganizationShort(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class ClientProfileResponse(BaseModel):
    id: int
    full_name: str | None
    iin: str | None
    channel: Channel
    whatsapp_phone: str | None
    telegram_user_id: int | None
    telegram_username: str | None
    organization: OrganizationShort | None
    created_at: datetime
    model_config = {"from_attributes": True}


class AssignedEmployeeShort(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


class FileShort(BaseModel):
    id: int
    original_name: str
    mime_type: str
    url: str
    model_config = {"from_attributes": True}


class ExternalMessageResponse(BaseModel):
    id: int
    direction: MessageDirection
    message_type: MessageType
    content: str | None
    file: FileShort | None
    wa_message_id: str | None
    tg_message_id: int | None
    is_forwarded: bool = False
    sent_at: datetime
    model_config = {"from_attributes": True}


class ExternalChatResponse(BaseModel):
    id: int
    channel: Channel
    status: ChatStatus
    last_message_at: datetime | None
    created_at: datetime
    client: ClientProfileResponse
    assigned_employee: AssignedEmployeeShort | None
    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str | None = None
    file_id: int | None = None
    is_forwarded: bool = False


class UpdateClientProfileRequest(BaseModel):
    full_name: str | None = None
    iin: str | None = None
    organization_id: int | None = None
