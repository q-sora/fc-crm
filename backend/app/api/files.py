import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.file import File
from app.models.user import User
from app.schemas.file import FileResponse
from app.api.deps import get_current_user

router = APIRouter()

MAX_BYTES = settings.max_file_size_mb * 1024 * 1024


def _file_url(stored_name: str) -> str:
    return f"/uploads/{stored_name}"


def _to_response(f: File) -> FileResponse:
    return FileResponse(
        id=f.id,
        original_name=f.original_name,
        mime_type=f.mime_type,
        size=f.size,
        url=_file_url(f.stored_path),
        created_at=f.created_at,
    )


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_file_size_mb} MB limit",
        )

    ext = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.upload_dir, stored_name)

    async with aiofiles.open(stored_path, "wb") as f_out:
        await f_out.write(content)

    record = File(
        original_name=file.filename or "file",
        stored_path=stored_name,
        mime_type=file.content_type or "application/octet-stream",
        size=len(content),
        uploaded_by=current_user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _to_response(record)


@router.get("/{file_id}", response_model=FileResponse)
async def get_file_info(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    record = await db.get(File, file_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return _to_response(record)
