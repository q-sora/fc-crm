import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, delete

from app.config import settings
from app.database import get_db
from app.models.client_profile import ClientProfile
from app.models.external_chat import ExternalChat
from app.models.external_message import ExternalMessage
from app.models.internal_message import InternalMessage
from app.models.file import File
from app.models.user import User
from app.schemas.external import ClientProfileResponse, UpdateClientProfileRequest
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=list[ClientProfileResponse])
async def list_client_profiles(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ClientProfile)
        .options(selectinload(ClientProfile.organization))
        .order_by(ClientProfile.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientProfileResponse)
async def get_client_profile(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    profile = await db.scalar(
        select(ClientProfile)
        .options(selectinload(ClientProfile.organization))
        .where(ClientProfile.id == client_id)
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return profile


@router.patch("/{client_id}", response_model=ClientProfileResponse)
async def update_client_profile(
    client_id: int,
    body: UpdateClientProfileRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    profile = await db.scalar(
        select(ClientProfile)
        .options(selectinload(ClientProfile.organization))
        .where(ClientProfile.id == client_id)
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    updated = body.model_fields_set
    if "full_name" in updated:
        profile.full_name = body.full_name
    if "iin" in updated:
        profile.iin = body.iin
    if "organization_id" in updated:
        profile.organization_id = body.organization_id

    await db.commit()
    await db.refresh(profile)
    # reload organization relation after refresh
    await db.execute(
        select(ClientProfile)
        .options(selectinload(ClientProfile.organization))
        .where(ClientProfile.id == client_id)
    )
    result = await db.scalar(
        select(ClientProfile)
        .options(selectinload(ClientProfile.organization))
        .where(ClientProfile.id == client_id)
    )
    return result


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_profile(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    profile = await db.get(ClientProfile, client_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Get all chats for this client
    chat_ids_result = await db.execute(
        select(ExternalChat.id).where(ExternalChat.client_profile_id == client_id)
    )
    chat_ids = list(chat_ids_result.scalars().all())

    # Collect all file IDs used in these chats' messages
    file_ids: set[int] = set()
    if chat_ids:
        file_result = await db.execute(
            select(ExternalMessage.file_id)
            .where(ExternalMessage.chat_id.in_(chat_ids), ExternalMessage.file_id.isnot(None))
        )
        file_ids = set(file_result.scalars().all())

    # Determine which files are referenced elsewhere (other external chats or internal chats)
    # — those must NOT be deleted from disk
    files_referenced_elsewhere: set[int] = set()
    if file_ids:
        if chat_ids:
            ext_result = await db.execute(
                select(ExternalMessage.file_id)
                .where(
                    ExternalMessage.file_id.in_(file_ids),
                    ExternalMessage.chat_id.notin_(chat_ids),
                )
            )
            files_referenced_elsewhere |= set(ext_result.scalars().all())

        int_result = await db.execute(
            select(InternalMessage.file_id)
            .where(InternalMessage.file_id.in_(file_ids))
        )
        files_referenced_elsewhere |= set(int_result.scalars().all())

    safe_to_delete = file_ids - files_referenced_elsewhere

    # Fetch stored paths before deletion
    stored_paths: list[str] = []
    if safe_to_delete:
        paths_result = await db.execute(
            select(File.stored_path).where(File.id.in_(safe_to_delete))
        )
        stored_paths = list(paths_result.scalars().all())

    # Delete messages in client's chats
    if chat_ids:
        await db.execute(
            delete(ExternalMessage).where(ExternalMessage.chat_id.in_(chat_ids))
        )

    # Delete file records that are exclusively owned by this client's chats
    if safe_to_delete:
        await db.execute(delete(File).where(File.id.in_(safe_to_delete)))

    # Delete chats
    if chat_ids:
        await db.execute(delete(ExternalChat).where(ExternalChat.id.in_(chat_ids)))

    # Delete client profile
    await db.execute(delete(ClientProfile).where(ClientProfile.id == client_id))
    await db.commit()

    # Remove physical files after successful commit
    for stored_name in stored_paths:
        full_path = os.path.join(settings.upload_dir, stored_name)
        try:
            if os.path.exists(full_path):
                os.unlink(full_path)
        except OSError:
            pass
