import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base


class InternalChatType(str, enum.Enum):
    direct = "direct"
    group = "group"


class InternalChat(Base):
    __tablename__ = "internal_chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[InternalChatType] = mapped_column(SAEnum(InternalChatType), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["InternalChatMember"]] = relationship(back_populates="chat", cascade="all, delete-orphan")
    messages: Mapped[list["InternalMessage"]] = relationship(back_populates="chat", order_by="InternalMessage.sent_at")  # noqa: F821


class InternalChatMember(Base):
    __tablename__ = "internal_chat_members"

    chat_id: Mapped[int] = mapped_column(ForeignKey("internal_chats.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["InternalChat"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="internal_chat_memberships")  # noqa: F821
