import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, BigInteger, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class Channel(str, enum.Enum):
    whatsapp = "whatsapp"
    telegram = "telegram"


class OnboardingStep(str, enum.Enum):
    ask_name = "ask_name"
    ask_iin = "ask_iin"
    ask_org = "ask_org"
    done = "done"


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    iin: Mapped[str | None] = mapped_column(String(12), nullable=True, index=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"), nullable=True)

    # Contact identifiers — at least one is set after onboarding
    whatsapp_phone: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True, index=True)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, unique=True, index=True)
    telegram_username: Mapped[str | None] = mapped_column(String(255), nullable=True)

    channel: Mapped[Channel] = mapped_column(SAEnum(Channel), nullable=False)
    onboarding_step: Mapped[OnboardingStep] = mapped_column(
        SAEnum(OnboardingStep), nullable=False, default=OnboardingStep.ask_name
    )
    # Temporary storage during onboarding: {"name": "...", "iin": "..."}
    onboarding_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    assigned_employee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization | None"] = relationship(back_populates="client_profiles")  # noqa: F821
    assigned_employee: Mapped["User | None"] = relationship(back_populates="assigned_client_profiles")  # noqa: F821
    external_chats: Mapped[list["ExternalChat"]] = relationship(back_populates="client_profile")  # noqa: F821
