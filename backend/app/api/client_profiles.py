from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.database import get_db
from app.models.client_profile import ClientProfile
from app.models.user import User
from app.schemas.external import ClientProfileResponse
from app.api.deps import get_current_user

router = APIRouter()


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
