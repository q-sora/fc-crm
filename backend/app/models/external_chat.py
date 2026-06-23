import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base
from app.models.client_profile import Channel


class ChatStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class ExternalChat(Base):
    __tablename__ = "external_chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_profile_id: Mapped[int] = mapped_column(ForeignKey("client_profiles.id"), nullable=False)
    assigned_employee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    channel: Mapped[Channel] = mapped_column(SAEnum(Channel), nullable=False)
    status: Mapped[ChatStatus] = mapped_column(SAEnum(ChatStatus), nullable=False, default=ChatStatus.active)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client_profile: Mapped["ClientProfile"] = relationship(back_populates="external_chats")  # noqa: F821
    assigned_employee: Mapped["User | None"] = relationship(back_populates="assigned_external_chats")  # noqa: F821
    messages: Mapped[list["ExternalMessage"]] = relationship(back_populates="chat", order_by="ExternalMessage.sent_at")  # noqa: F821
