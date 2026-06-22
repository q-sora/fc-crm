import enum
from datetime import datetime
from sqlalchemy import Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base


class InternalMessageType(str, enum.Enum):
    text = "text"
    image = "image"
    document = "document"


class InternalMessage(Base):
    __tablename__ = "internal_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("internal_chats.id"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_type: Mapped[InternalMessageType] = mapped_column(
        SAEnum(InternalMessageType), nullable=False, default=InternalMessageType.text
    )
    file_id: Mapped[int | None] = mapped_column(ForeignKey("files.id"), nullable=True)
    is_forwarded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["InternalChat"] = relationship(back_populates="messages")  # noqa: F821
    sender: Mapped["User"] = relationship(back_populates="internal_messages_sent")  # noqa: F821
    file: Mapped["File | None"] = relationship()  # noqa: F821
