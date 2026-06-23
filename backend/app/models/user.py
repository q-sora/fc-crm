import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, func, Table, Column, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base

user_organizations = Table(
    "user_organizations",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
)


class UserRole(str, enum.Enum):
    admin = "admin"
    employee = "employee"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.employee)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organizations: Mapped[list["Organization"]] = relationship(  # noqa: F821
        "Organization",
        secondary=user_organizations,
        back_populates="users",
    )
    assigned_external_chats: Mapped[list["ExternalChat"]] = relationship(back_populates="assigned_employee", passive_deletes=True)  # noqa: F821
    assigned_client_profiles: Mapped[list["ClientProfile"]] = relationship(back_populates="assigned_employee", passive_deletes=True)  # noqa: F821
    internal_chat_memberships: Mapped[list["InternalChatMember"]] = relationship(back_populates="user", passive_deletes=True)  # noqa: F821
    internal_messages_sent: Mapped[list["InternalMessage"]] = relationship(back_populates="sender", passive_deletes=True)  # noqa: F821
    quick_phrases: Mapped[list["QuickPhrase"]] = relationship(back_populates="created_by_user", passive_deletes=True)  # noqa: F821
    uploaded_files: Mapped[list["File"]] = relationship(back_populates="uploaded_by_user", passive_deletes=True)  # noqa: F821
