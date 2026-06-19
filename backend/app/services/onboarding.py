"""
Onboarding FSM shared by WhatsApp and Telegram channels.

Steps: ask_name → ask_iin → ask_org → done

After 'done':
  - ClientProfile is created/updated with full_name, iin, organization
  - ExternalChat is created and assigned to a suitable employee
  - Frontend is notified via WebSocket
"""
import re
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.client_profile import ClientProfile, Channel, OnboardingStep
from app.models.external_chat import ExternalChat, ChatStatus
from app.models.external_message import ExternalMessage, MessageDirection, MessageType
from app.models.onboarding_session import OnboardingSession
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.websocket.manager import manager

IIN_RE = re.compile(r"^\d{12}$")

# ── Replies ────────────────────────────────────────────────────────────────────

GREET = (
    "Добро пожаловать в FC CRM!\n"
    "Пожалуйста, представьтесь — введите ваше ФИО."
)
ASK_IIN = "Введите ваш ИИН (12 цифр)."
BAD_IIN = "ИИН должен содержать ровно 12 цифр. Попробуйте ещё раз."
ASK_ORG_TPL = "Укажите ваше учебное заведение / организацию.\n\nДоступные варианты:\n{orgs}"
BAD_ORG_TPL = "Организация не найдена. Выберите из списка:\n{orgs}"
DONE_MSG = "Спасибо! Ваш вопрос передан специалисту. Ожидайте ответа."
NO_TEXT = "Пожалуйста, ответьте текстом."


# ── Public entry point ─────────────────────────────────────────────────────────

async def handle_incoming(
    *,
    channel: Channel,
    external_id: str,           # phone (WA) or str(tg_user_id) (TG)
    text: str | None,
    db: AsyncSession,
    tg_username: str | None = None,
    wa_message_id: str | None = None,
    tg_message_id: int | None = None,
    file_id: int | None = None,
    message_type: MessageType = MessageType.text,
) -> str | None:
    """
    Process one incoming message.
    Returns the reply text to send back (or None if no reply needed).
    """
    profile = await _get_profile(channel, external_id, db)

    if profile and profile.onboarding_step == OnboardingStep.done:
        await _save_incoming_message(
            profile=profile,
            text=text,
            file_id=file_id,
            message_type=message_type,
            wa_message_id=wa_message_id,
            tg_message_id=tg_message_id,
            db=db,
        )
        return None  # employee replies manually via UI

    # ── Onboarding in progress ─────────────────────────────────────────────────
    session = await _get_or_create_session(channel, external_id, db)

    if session.step == OnboardingStep.ask_name:
        if not text:
            return NO_TEXT
        session.collected_data = {**session.collected_data, "name": text.strip()}
        session.step = OnboardingStep.ask_iin
        await db.commit()
        return ASK_IIN

    if session.step == OnboardingStep.ask_iin:
        if not text or not IIN_RE.match(text.strip()):
            return BAD_IIN
        session.collected_data = {**session.collected_data, "iin": text.strip()}
        session.step = OnboardingStep.ask_org
        await db.commit()
        orgs = await _org_list(db)
        return ASK_ORG_TPL.format(orgs=orgs)

    if session.step == OnboardingStep.ask_org:
        if not text:
            return NO_TEXT
        org = await _find_org(text.strip(), db)
        if not org:
            orgs = await _org_list(db)
            return BAD_ORG_TPL.format(orgs=orgs)

        await _complete_onboarding(
            session=session,
            org=org,
            channel=channel,
            external_id=external_id,
            tg_username=tg_username,
            db=db,
        )
        return DONE_MSG

    return None


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_profile(channel: Channel, external_id: str, db: AsyncSession) -> ClientProfile | None:
    if channel == Channel.whatsapp:
        return await db.scalar(
            select(ClientProfile).where(ClientProfile.whatsapp_phone == external_id)
        )
    return await db.scalar(
        select(ClientProfile).where(ClientProfile.telegram_user_id == int(external_id))
    )


async def _get_or_create_session(channel: Channel, external_id: str, db: AsyncSession) -> OnboardingSession:
    session = await db.scalar(
        select(OnboardingSession).where(
            OnboardingSession.channel == channel,
            OnboardingSession.external_id == external_id,
        )
    )
    if not session:
        session = OnboardingSession(channel=channel, external_id=external_id, collected_data={})
        db.add(session)
        await db.commit()
        await db.refresh(session)
    return session


async def _org_list(db: AsyncSession) -> str:
    orgs = await db.scalars(select(Organization).order_by(Organization.name))
    return "\n".join(f"• {o.name}" for o in orgs.all()) or "(список пуст — обратитесь к администратору)"


async def _find_org(text: str, db: AsyncSession) -> Organization | None:
    # exact match first
    org = await db.scalar(
        select(Organization).where(func.lower(Organization.name) == text.lower())
    )
    if org:
        return org
    # partial match
    return await db.scalar(
        select(Organization).where(Organization.name.ilike(f"%{text}%"))
    )


async def _complete_onboarding(
    *,
    session: OnboardingSession,
    org: Organization,
    channel: Channel,
    external_id: str,
    tg_username: str | None,
    db: AsyncSession,
) -> None:
    data = session.collected_data
    employee = await _assign_employee(org.id, db)

    profile = ClientProfile(
        full_name=data.get("name"),
        iin=data.get("iin"),
        organization_id=org.id,
        channel=channel,
        onboarding_step=OnboardingStep.done,
        onboarding_data={},
        assigned_employee_id=employee.id if employee else None,
    )
    if channel == Channel.whatsapp:
        profile.whatsapp_phone = external_id
    else:
        profile.telegram_user_id = int(external_id)
        profile.telegram_username = tg_username

    db.add(profile)
    await db.flush()  # get profile.id

    chat = ExternalChat(
        client_profile_id=profile.id,
        assigned_employee_id=employee.id if employee else None,
        channel=channel,
        status=ChatStatus.active,
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(chat)

    # Remove onboarding session — no longer needed
    await db.delete(session)
    await db.commit()
    await db.refresh(chat)

    # Notify employee via WebSocket
    if employee:
        await manager.send_to_user(employee.id, {
            "type": "client:onboarding:done",
            "chatId": chat.id,
            "clientId": profile.id,
            "clientName": profile.full_name,
            "channel": channel.value,
        })


async def _assign_employee(org_id: int, db: AsyncSession) -> User | None:
    """Pick the active employee for this org with the fewest open chats."""
    employees = (await db.scalars(
        select(User).where(
            User.role == UserRole.employee,
            User.is_active == True,  # noqa: E712
            User.organization_id == org_id,
        )
    )).all()

    if not employees:
        # Fallback: any active admin
        employees = (await db.scalars(
            select(User).where(User.role == UserRole.admin, User.is_active == True)  # noqa: E712
        )).all()

    if not employees:
        return None

    # Fewest active chats wins
    counts: dict[int, int] = {}
    for emp in employees:
        count = await db.scalar(
            select(func.count(ExternalChat.id)).where(
                ExternalChat.assigned_employee_id == emp.id,
                ExternalChat.status == ChatStatus.active,
            )
        ) or 0
        counts[emp.id] = count

    return min(employees, key=lambda e: counts[e.id])


async def _save_incoming_message(
    *,
    profile: ClientProfile,
    text: str | None,
    file_id: int | None,
    message_type: MessageType,
    wa_message_id: str | None,
    tg_message_id: int | None,
    db: AsyncSession,
) -> None:
    chat = await db.scalar(
        select(ExternalChat).where(
            ExternalChat.client_profile_id == profile.id,
            ExternalChat.status == ChatStatus.active,
        )
    )
    if not chat:
        return

    msg = ExternalMessage(
        chat_id=chat.id,
        direction=MessageDirection.incoming,
        message_type=message_type,
        content=text,
        file_id=file_id,
        wa_message_id=wa_message_id,
        tg_message_id=tg_message_id,
    )
    db.add(msg)
    chat.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(msg)

    # Notify assigned employee
    if chat.assigned_employee_id:
        await manager.send_to_user(chat.assigned_employee_id, {
            "type": "external:message:new",
            "chatId": chat.id,
            "message": {
                "id": msg.id,
                "direction": "in",
                "messageType": message_type.value,
                "content": text,
                "fileId": file_id,
                "sentAt": msg.sent_at.isoformat(),
            },
        })
