from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.scalars(select(Organization).order_by(Organization.id))
    return result.all()


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # Split by | to support aliases: "Школа №2 | sch2 | Второй лицей"
    parts = [p.strip() for p in body.name.split("|") if p.strip()]
    if not parts:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is required")

    primary_name = parts[0]
    aliases = parts[1:]

    existing = await db.scalar(select(Organization).where(Organization.name == primary_name))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization already exists")

    org = Organization(name=primary_name, aliases=aliases)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    await db.delete(org)
    await db.commit()
