from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base
from app.models.user import user_organizations


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    aliases: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(  # noqa: F821
        "User",
        secondary=user_organizations,
        back_populates="organizations",
    )
    client_profiles: Mapped[list["ClientProfile"]] = relationship(back_populates="organization")  # noqa: F821
