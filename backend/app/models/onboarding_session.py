from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Enum as SAEnum

from app.database import Base
from app.models.client_profile import Channel, OnboardingStep


class OnboardingSession(Base):
    """Temporary state during client onboarding. Deleted after step == done."""

    __tablename__ = "onboarding_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    channel: Mapped[Channel] = mapped_column(SAEnum(Channel), nullable=False)
    # phone number for WA, telegram_user_id (as string) for TG
    external_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    step: Mapped[OnboardingStep] = mapped_column(
        SAEnum(OnboardingStep), nullable=False, default=OnboardingStep.ask_name
    )
    collected_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
