import enum
from datetime import datetime
from sqlalchemy import Boolean, String, DateTime, ForeignKey, BigInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from app.database import Base


class MessageDirection(str, enum.Enum):
    incoming = "in"
    outgoing = "out"


class MessageType(str, enum.Enum):
    text = "text"
    image = "image"
    document = "document"
    audio = "audio"
    video = "video"


class ExternalMessage(Base):
    __tablename__ = "external_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("external_chats.id"), nullable=False, index=True)
    direction: Mapped[MessageDirection] = mapped_column(SAEnum(MessageDirection, values_callable=lambda x: [e.value for e in x]), nullable=False)
    message_type: Mapped[MessageType] = mapped_column(SAEnum(MessageType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=MessageType.text)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_id: Mapped[int | None] = mapped_column(ForeignKey("files.id"), nullable=True)
    wa_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    tg_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    is_forwarded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["ExternalChat"] = relationship(back_populates="messages")  # noqa: F821
    file: Mapped["File | None"] = relationship()  # noqa: F821
