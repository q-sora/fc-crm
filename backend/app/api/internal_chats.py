from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, and_, delete

from app.database import get_db
from app.models.file import File
from app.models.internal_chat import InternalChat, InternalChatMember, InternalChatType
from app.models.internal_message import InternalMessage, InternalMessageType
from app.models.user import User
from app.schemas.internal import (
    InternalChatCreate,
    InternalChatResponse,
    InternalMessageResponse,
    MemberShort,
    FileShort,
    SendInternalMessageRequest,
    UpdateChatMembersRequest,
)
from app.api.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter()


def _file_url(stored_name: str) -> str:
    return f"/uploads/{stored_name}"


def _build_msg_response(msg: InternalMessage, sender: User | None, file: File | None) -> InternalMessageResponse:
    file_short = None
    if file:
        file_short = FileShort(
            id=file.id,
            original_name=file.original_name,
            mime_type=file.mime_type,
            url=_file_url(file.stored_path),
        )
    return InternalMessageResponse(
        id=msg.id,
        chat_id=msg.chat_id,
        sender_id=msg.sender_id,
        sender_name=sender.name if sender else None,
        content=msg.content,
        message_type=msg.message_type,
        file=file_short,
        is_forwarded=msg.is_forwarded,
        sent_at=msg.sent_at,
    )


@router.get("/chats", response_model=list[InternalChatResponse])
async def list_my_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all internal chats where the current user is a member."""
    result = await db.scalars(
        select(InternalChat)
        .join(InternalChatMember, InternalChat.id == InternalChatMember.chat_id)
        .options(
            selectinload(InternalChat.members).selectinload(InternalChatMember.user)
        )
        .where(InternalChatMember.user_id == current_user.id)
        .order_by(InternalChat.created_at.desc())
    )
    chats = result.all()

    out = []
    for chat in chats:
        members = [MemberShort(id=m.user.id, name=m.user.name) for m in chat.members]
        out.append(InternalChatResponse(
            id=chat.id,
            type=chat.type,
            name=chat.name,
            members=members,
            created_at=chat.created_at,
        ))
    return out


@router.post("/chats", response_model=InternalChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    body: InternalChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    all_member_ids = list({current_user.id, *body.member_ids})

    # For direct chats: reuse existing chat if it exists
    if body.type == InternalChatType.direct:
        if len(all_member_ids) != 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Direct chat requires exactly one other member",
            )
        other_id = next(i for i in all_member_ids if i != current_user.id)

        # Find existing direct chat with exactly these two members
        existing = await db.scalar(
            select(InternalChat)
            .join(InternalChatMember, InternalChat.id == InternalChatMember.chat_id)
            .options(selectinload(InternalChat.members).selectinload(InternalChatMember.user))
            .where(
                InternalChat.type == InternalChatType.direct,
                InternalChatMember.user_id == current_user.id,
                InternalChat.id.in_(
                    select(InternalChatMember.chat_id).where(InternalChatMember.user_id == other_id)
                ),
            )
        )
        if existing:
            members = [MemberShort(id=m.user.id, name=m.user.name) for m in existing.members]
            return InternalChatResponse(
                id=existing.id, type=existing.type, name=existing.name,
                members=members, created_at=existing.created_at,
            )

    if body.type == InternalChatType.group and not body.name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Group chat requires a name",
        )

    # Verify all member_ids exist
    for uid in all_member_ids:
        if not await db.get(User, uid):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {uid} not found")

    chat = InternalChat(type=body.type, name=body.name)
    db.add(chat)
    await db.flush()

    for uid in all_member_ids:
        db.add(InternalChatMember(chat_id=chat.id, user_id=uid))

    await db.commit()

    # Reload with members
    chat = await db.scalar(
        select(InternalChat)
        .options(selectinload(InternalChat.members).selectinload(InternalChatMember.user))
        .where(InternalChat.id == chat.id)
    )
    members = [MemberShort(id=m.user.id, name=m.user.name) for m in chat.members]
    return InternalChatResponse(
        id=chat.id, type=chat.type, name=chat.name,
        members=members, created_at=chat.created_at,
    )


@router.get("/chats/{chat_id}/messages", response_model=list[InternalMessageResponse])
async def get_messages(
    chat_id: int,
    limit: int = Query(50, le=200),
    before_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify membership
    member = await db.scalar(
        select(InternalChatMember).where(
            InternalChatMember.chat_id == chat_id,
            InternalChatMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chat")

    q = (
        select(InternalMessage)
        .options(selectinload(InternalMessage.file), selectinload(InternalMessage.sender))
        .where(InternalMessage.chat_id == chat_id)
        .order_by(InternalMessage.id.desc())
        .limit(limit)
    )
    if before_id:
        q = q.where(InternalMessage.id < before_id)

    rows = list(reversed((await db.scalars(q)).all()))
    return [_build_msg_response(m, m.sender, m.file) for m in rows]


@router.post("/chats/{chat_id}/send", response_model=InternalMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: int,
    body: SendInternalMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.content and not body.file_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="content or file_id required")

    member = await db.scalar(
        select(InternalChatMember).where(
            InternalChatMember.chat_id == chat_id,
            InternalChatMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chat")

    file_record: File | None = None
    msg_type = InternalMessageType.text

    if body.file_id:
        file_record = await db.get(File, body.file_id)
        if not file_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        mime = file_record.mime_type
        msg_type = InternalMessageType.image if mime.startswith("image/") else InternalMessageType.document

    msg = InternalMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=body.content,
        message_type=msg_type,
        file_id=body.file_id,
        is_forwarded=body.is_forwarded,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Notify all other members
    all_members = (await db.scalars(
        select(InternalChatMember).where(
            InternalChatMember.chat_id == chat_id,
            InternalChatMember.user_id != current_user.id,
        )
    )).all()

    ws_payload = {
        "type": "internal:message:new",
        "chatId": chat_id,
        "message": {
            "id": msg.id,
            "chatId": chat_id,
            "senderId": current_user.id,
            "senderName": current_user.name,
            "content": body.content,
            "messageType": msg_type.value,
            "isForwarded": body.is_forwarded,
            "file": {
                "id": file_record.id,
                "originalName": file_record.original_name,
                "mimeType": file_record.mime_type,
                "url": _file_url(file_record.stored_path),
            } if file_record else None,
            "sentAt": msg.sent_at.isoformat(),
        },
    }
    for m in all_members:
        await manager.send_to_user(m.user_id, ws_payload)

    return _build_msg_response(msg, current_user, file_record)


@router.patch("/chats/{chat_id}/members", response_model=InternalChatResponse)
async def update_chat_members(
    chat_id: int,
    body: UpdateChatMembersRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat = await db.scalar(
        select(InternalChat)
        .options(selectinload(InternalChat.members).selectinload(InternalChatMember.user))
        .where(InternalChat.id == chat_id)
    )
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if chat.type != InternalChatType.group:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only group chats support member editing")
    member_ids = await db.scalar(
        select(InternalChatMember.user_id).where(
            InternalChatMember.chat_id == chat_id,
            InternalChatMember.user_id == current_user.id,
        )
    )
    if not member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    new_ids = set(body.member_ids)

    await db.execute(
        delete(InternalChatMember).where(InternalChatMember.chat_id == chat_id)
    )
    for uid in new_ids:
        db.add(InternalChatMember(chat_id=chat_id, user_id=uid))
    await db.commit()

    chat = await db.scalar(
        select(InternalChat)
        .options(selectinload(InternalChat.members).selectinload(InternalChatMember.user))
        .where(InternalChat.id == chat_id)
    )
    members = [MemberShort(id=m.user.id, name=m.user.name) for m in chat.members]
    return InternalChatResponse(id=chat.id, type=chat.type, name=chat.name, members=members, created_at=chat.created_at)


@router.delete("/chats/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = await db.scalar(
        select(InternalChatMember).where(
            InternalChatMember.chat_id == chat_id,
            InternalChatMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    await db.execute(delete(InternalMessage).where(InternalMessage.chat_id == chat_id))
    await db.execute(delete(InternalChatMember).where(InternalChatMember.chat_id == chat_id))
    await db.execute(delete(InternalChat).where(InternalChat.id == chat_id))
    await db.commit()
