from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class OrganizationShort(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole = UserRole.employee
    organization_ids: list[int] = []


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    organization_ids: list[int] | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    organizations: list[OrganizationShort] = []
    created_at: datetime

    model_config = {"from_attributes": True}
