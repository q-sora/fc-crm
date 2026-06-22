"""
Internal endpoint called by wa-bridge (Node.js) when a WhatsApp message arrives.
Protected by a shared secret token, not by user JWT.
"""
import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
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


_MIME_EXT: dict[str, str] = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a', 'video/mp4': '.mp4', 'video/webm': '.webm',
    'application/pdf': '.pdf',
}


@router.post("/files/upload", status_code=status.HTTP_201_CREATED, dependencies=[Depends(_verify_token)])
async def upload_wa_file(
    request: Request,
    filename: str = Query("file"),
    mime_type: str = Query("application/octet-stream"),
    db: AsyncSession = Depends(get_db),
):
    data = await request.body()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty body")

    from app.models.file import File
    ext = _MIME_EXT.get(mime_type) or os.path.splitext(filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.upload_dir, stored_name)

    async with aiofiles.open(stored_path, "wb") as f:
        await f.write(data)

    record = File(
        original_name=filename,
        stored_path=stored_name,
        mime_type=mime_type,
        size=len(data),
        uploaded_by=None,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"file_id": record.id}


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
        try:
            await send_wa_text(msg.phone, reply)
        except Exception as exc:
            print(f"[wa-webhook] failed to send reply to {msg.phone}: {exc}")

    return {"ok": True}
