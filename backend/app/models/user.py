import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base


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
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization | None"] = relationship(back_populates="users")  # noqa: F821
    assigned_external_chats: Mapped[list["ExternalChat"]] = relationship(back_populates="assigned_employee")  # noqa: F821
    assigned_client_profiles: Mapped[list["ClientProfile"]] = relationship(back_populates="assigned_employee")  # noqa: F821
    internal_chat_memberships: Mapped[list["InternalChatMember"]] = relationship(back_populates="user")  # noqa: F821
    internal_messages_sent: Mapped[list["InternalMessage"]] = relationship(back_populates="sender")  # noqa: F821
    quick_phrases: Mapped[list["QuickPhrase"]] = relationship(back_populates="created_by_user")  # noqa: F821
    uploaded_files: Mapped[list["File"]] = relationship(back_populates="uploaded_by_user")  # noqa: F821
