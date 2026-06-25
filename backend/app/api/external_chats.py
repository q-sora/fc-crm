from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, or_

from app.database import get_db
from app.models.client_profile import Channel, ClientProfile
from app.models.external_chat import ExternalChat, ChatStatus
from app.models.external_message import ExternalMessage, MessageDirection, MessageType
from app.models.file import File
from app.models.user import User, UserRole
from app.schemas.external import ExternalChatResponse, ExternalMessageResponse, SendMessageRequest, FileShort
from app.api.deps import get_current_user
from app.services.whatsapp import send_wa_text, send_wa_file
from app.services.telegram_out import send_tg_text, send_tg_file
from app.websocket.manager import manager

router = APIRouter()


def _user_chat_filter(q, user: User):
    """Admins see all chats. Employees see chats assigned to them, from their orgs,
    or unresolved chats (no org, no assignee)."""
    if user.role == UserRole.admin:
        return q
    from sqlalchemy import and_
    user_org_ids = [org.id for org in user.organizations]
    conditions = [
        ExternalChat.assigned_employee_id == user.id,
        # No org + no assignee → visible to all employees
        and_(
            ExternalChat.assigned_employee_id.is_(None),
            ExternalChat.client_profile.has(ClientProfile.organization_id.is_(None)),
        ),
    ]
    if user_org_ids:
        conditions.append(
            ExternalChat.client_profile.has(ClientProfile.organization_id.in_(user_org_ids))
        )
    return q.where(or_(*conditions))


def _can_access_chat(chat: ExternalChat, user: User) -> bool:
    if user.role == UserRole.admin:
        return True
    if chat.assigned_employee_id == user.id:
        return True
    if chat.assigned_employee_id is None:
        org_id = chat.client_profile.organization_id if chat.client_profile else None
        if org_id is None:
            return True  # unassigned + no org → visible to all
    user_org_ids = {org.id for org in user.organizations}
    org_id = chat.client_profile.organization_id if chat.client_profile else None
    return org_id is not None and org_id in user_org_ids


def _file_url(stored_name: str) -> str:
    return f"/uploads/{stored_name}"


def _build_message_response(msg: ExternalMessage, file: File | None) -> ExternalMessageResponse:
    file_short = None
    if file:
        file_short = FileShort(
            id=file.id,
            original_name=file.original_name,
            mime_type=file.mime_type,
            url=_file_url(file.stored_path),
        )
    return ExternalMessageResponse(
        id=msg.id,
        direction=msg.direction,
        message_type=msg.message_type,
        content=msg.content,
        file=file_short,
        wa_message_id=msg.wa_message_id,
        tg_message_id=msg.tg_message_id,
        is_forwarded=msg.is_forwarded,
        sent_at=msg.sent_at,
    )


@router.get("/chats", response_model=list[ExternalChatResponse])
async def list_chats(
    status: ChatStatus = Query(ChatStatus.active),
    channel: Channel | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(ExternalChat)
        .options(
            selectinload(ExternalChat.client_profile).selectinload(ClientProfile.organization),
            selectinload(ExternalChat.assigned_employee),
        )
        .where(ExternalChat.status == status)
        .order_by(ExternalChat.last_message_at.desc().nullsfirst())
    )
    if channel:
        q = q.where(ExternalChat.channel == channel)
    q = _user_chat_filter(q, current_user)

    result = await db.scalars(q)
    chats = result.all()

    out = []
    for chat in chats:
        cp = chat.client_profile
        out.append(ExternalChatResponse(
            id=chat.id,
            channel=chat.channel,
            status=chat.status,
            last_message_at=chat.last_message_at,
            created_at=chat.created_at,
            client=cp,
            assigned_employee=chat.assigned_employee,
        ))
    return out


@router.get("/chats/{chat_id}/messages", response_model=list[ExternalMessageResponse])
async def get_messages(
    chat_id: int,
    limit: int = Query(50, le=200),
    before_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.scalar(
        select(ExternalChat)
        .options(selectinload(ExternalChat.client_profile))
        .where(ExternalChat.id == chat_id)
    )
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if not _can_access_chat(chat, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    q = (
        select(ExternalMessage)
        .options(selectinload(ExternalMessage.file))
        .where(ExternalMessage.chat_id == chat_id)
        .order_by(ExternalMessage.id.desc())
        .limit(limit)
    )
    if before_id:
        q = q.where(ExternalMessage.id < before_id)

    rows = (await db.scalars(q)).all()
    # Return in chronological order
    rows = list(reversed(rows))

    return [_build_message_response(m, m.file) for m in rows]


@router.post("/chats/{chat_id}/send", response_model=ExternalMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: int,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.content and not body.file_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content or file_id required")

    chat = await db.scalar(
        select(ExternalChat)
        .options(selectinload(ExternalChat.client_profile))
        .where(ExternalChat.id == chat_id)
    )
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if not _can_access_chat(chat, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if chat.status == ChatStatus.archived:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send to archived chat")

    file_record: File | None = None
    msg_type = MessageType.text

    if body.file_id:
        file_record = await db.get(File, body.file_id)
        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        mime = file_record.mime_type
        if mime.startswith("image/"):
            msg_type = MessageType.image
        elif mime.startswith("audio/"):
            msg_type = MessageType.audio
        elif mime.startswith("video/"):
            msg_type = MessageType.video
        else:
            msg_type = MessageType.document

    # Save outgoing message
    msg = ExternalMessage(
        chat_id=chat_id,
        direction=MessageDirection.outgoing,
        message_type=msg_type,
        content=body.content,
        file_id=body.file_id,
        is_forwarded=body.is_forwarded,
    )
    db.add(msg)
    chat.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(msg)

    # Deliver via the correct channel
    cp = chat.client_profile
    try:
        if chat.channel == Channel.whatsapp and cp.whatsapp_phone:
            if file_record:
                await send_wa_file(
                    cp.whatsapp_phone,
                    f"http://backend:8000{_file_url(file_record.stored_path)}",
                    file_record.mime_type,
                    file_record.original_name,
                    caption=body.content or "",
                )
            else:
                await send_wa_text(cp.whatsapp_phone, body.content or "")

        elif chat.channel == Channel.telegram and cp.telegram_user_id:
            if file_record:
                await send_tg_file(
                    cp.telegram_user_id,
                    file_record.stored_path,
                    file_record.original_name,
                    file_record.mime_type,
                    caption=body.content or "",
                )
            else:
                await send_tg_text(cp.telegram_user_id, body.content or "")
    except Exception as exc:
        # Message saved in DB; delivery failure logged but not fatal
        print(f"[send] delivery error: {exc}")

    # Notify the assigned employee's other sessions via WS
    if chat.assigned_employee_id and chat.assigned_employee_id != current_user.id:
        await manager.send_to_user(chat.assigned_employee_id, {
            "type": "external:message:new",
            "chatId": chat_id,
            "message": {
                "id": msg.id,
                "direction": "out",
                "messageType": msg_type.value,
                "content": body.content,
                "fileId": body.file_id,
                "isForwarded": body.is_forwarded,
                "sentAt": msg.sent_at.isoformat(),
            },
        })

    return _build_message_response(msg, file_record)


@router.post("/chats/{chat_id}/archive", status_code=status.HTTP_200_OK)
async def archive_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    chat = await db.get(ExternalChat, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    chat.status = ChatStatus.archived
    await db.commit()
    return {"ok": True, "chatId": chat_id}


@router.post("/chats/{chat_id}/unarchive", status_code=status.HTTP_200_OK)
async def unarchive_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    chat = await db.get(ExternalChat, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    chat.status = ChatStatus.active
    await db.commit()
    return {"ok": True, "chatId": chat_id}


@router.get("/archive", response_model=list[ExternalChatResponse])
async def list_archive(
    channel: Channel | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Shortcut: GET /external/archive == GET /external/chats?status=archived"""
    q = (
        select(ExternalChat)
        .options(
            selectinload(ExternalChat.client_profile).selectinload(ClientProfile.organization),
            selectinload(ExternalChat.assigned_employee),
        )
        .where(ExternalChat.status == ChatStatus.archived)
        .order_by(ExternalChat.last_message_at.desc().nullsfirst())
    )
    if channel:
        q = q.where(ExternalChat.channel == channel)
    q = _user_chat_filter(q, current_user)

    result = await db.scalars(q)
    chats = result.all()

    return [
        ExternalChatResponse(
            id=c.id,
            channel=c.channel,
            status=c.status,
            last_message_at=c.last_message_at,
            created_at=c.created_at,
            client=c.client_profile,
            assigned_employee=c.assigned_employee,
        )
        for c in chats
    ]
