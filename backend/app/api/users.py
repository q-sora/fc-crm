from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.auth import hash_password
from app.api.deps import get_current_user, require_admin

router = APIRouter()


async def _load_orgs(ids: list[int], db: AsyncSession) -> list[Organization]:
    if not ids:
        return []
    result = await db.scalars(select(Organization).where(Organization.id.in_(ids)))
    return list(result.all())


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(User).options(selectinload(User.organizations)).order_by(User.created_at)
    )
    return result.all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    orgs = await _load_orgs(body.organization_ids, db)

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
        organizations=orgs,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user, ["organizations"])
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = await db.scalar(
        select(User).options(selectinload(User.organizations)).where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = await db.scalar(
        select(User).options(selectinload(User.organizations)).where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        conflict = await db.scalar(select(User).where(User.email == body.email, User.id != user_id))
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = body.email
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.organization_ids is not None:
        user.organizations = await _load_orgs(body.organization_ids, db)

    await db.commit()
    await db.refresh(user, ["organizations"])
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
