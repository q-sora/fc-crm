"""
Internal endpoint called by wa-bridge (Node.js) when a WhatsApp message arrives.
Protected by a shared secret token, not by user JWT.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.client_profile import Channel
from app.models.external_message import MessageType
from app.services.onboarding import handle_incoming
from app.services.whatsapp import send_wa_text

router = APIRouter()


class WAMessagePayload(BaseModel):
    phone: str
    wa_message_id: str
    message_type: str = "text"   # text | image | document | audio | video
    content: str | None = None
    file_id: int | None = None   # set by bridge after uploading file to /files/upload-internal


def _verify_token(authorization: str = Header(...)) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    if token != settings.wa_bridge_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bridge token")


class WAWebhookBody(BaseModel):
    event: str
    data: WAMessagePayload


@router.post("/wa-webhook", dependencies=[Depends(_verify_token)])
async def wa_webhook(body: WAWebhookBody, db: AsyncSession = Depends(get_db)):
    if body.event != "message":
        return {"ok": True}

    msg = body.data
    try:
        msg_type = MessageType(msg.message_type)
    except ValueError:
        msg_type = MessageType.text

    reply = await handle_incoming(
        channel=Channel.whatsapp,
        external_id=msg.phone,
        text=msg.content,
        db=db,
        wa_message_id=msg.wa_message_id,
        file_id=msg.file_id,
        message_type=msg_type,
    )

    if reply:
        await send_wa_text(msg.phone, reply)

    return {"ok": True}
