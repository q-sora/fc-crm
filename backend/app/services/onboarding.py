"""
Onboarding FSM shared by WhatsApp and Telegram channels.

Steps: ask_name → ask_iin → ask_org → done

After 'done':
  - ClientProfile is created/updated with full_name, iin, organization
  - ExternalChat is created and assigned to a suitable employee
  - Frontend is notified via WebSocket
"""
import re
import difflib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.client_profile import ClientProfile, Channel, OnboardingStep
from app.models.external_chat import ExternalChat, ChatStatus
from app.models.external_message import ExternalMessage, MessageDirection, MessageType
from app.models.onboarding_session import OnboardingSession
from app.models.organization import Organization
from app.models.user import User, UserRole, user_organizations
from app.websocket.manager import manager
from sqlalchemy.orm import selectinload

IIN_RE = re.compile(r"^\d{12}$")

# ── Replies ────────────────────────────────────────────────────────────────────

GREET = (
    "Добро пожаловать в FC CRM!\n"
    "Пожалуйста, представьтесь — введите ваше ФИО."
)
ASK_IIN = "Введите ваш ИИН (12 цифр)."
BAD_IIN = "ИИН должен содержать ровно 12 цифр. Попробуйте ещё раз."
ASK_ORG = "Укажите вашу организацию / учебное заведение."
BAD_ORG_RETRY = "Организация не найдена. Попробуйте ещё раз."
BAD_ORG_FINAL = "Не удалось определить организацию. Ваш вопрос передан специалистам — они свяжутся с вами в ближайшее время."
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
    session, is_new = await _get_or_create_session(channel, external_id, db)

    if is_new:
        return GREET

    if session.step == OnboardingStep.ask_name:
        if not text:
            return NO_TEXT
        session.collected_data = {**session.collected_data, "name": text.strip()}
        session.step = OnboardingStep.ask_iin
        await db.commit()
        return ASK_IIN

    if session.step == OnboardingStep.ask_iin:
        clean_iin = re.sub(r"[\s\-]", "", text or "")
        if not IIN_RE.match(clean_iin):
            return BAD_IIN
        session.collected_data = {**session.collected_data, "iin": clean_iin}
        session.step = OnboardingStep.ask_org
        await db.commit()
        return ASK_ORG

    if session.step == OnboardingStep.ask_org:
        if not text:
            return NO_TEXT

        org = await _find_org(text.strip(), db)
        if org:
            await _complete_onboarding(
                session=session,
                org=org,
                channel=channel,
                external_id=external_id,
                tg_username=tg_username,
                db=db,
            )
            return DONE_MSG

        # Not found — track attempts
        attempts = session.collected_data.get("org_attempts", 0) + 1
        session.collected_data = {
            **session.collected_data,
            "org_attempts": attempts,
            "org_text": text.strip(),
        }
        await db.commit()

        if attempts >= 2:
            # 2nd failure — create chat, assign to least-loaded admin
            await _complete_onboarding_no_org(
                session=session,
                channel=channel,
                external_id=external_id,
                tg_username=tg_username,
                db=db,
            )
            return BAD_ORG_FINAL

        return BAD_ORG_RETRY

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


async def _get_or_create_session(channel: Channel, external_id: str, db: AsyncSession) -> tuple[OnboardingSession, bool]:
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
        return session, True
    return session, False


def _similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a.lower(), b.lower()).ratio()


async def _find_org(text: str, db: AsyncSession) -> Organization | None:
    orgs = (await db.scalars(select(Organization))).all()
    text_lower = text.lower()

    # Exact match (name or aliases)
    for org in orgs:
        if org.name.lower() == text_lower:
            return org
        if any(a.lower() == text_lower for a in (org.aliases or [])):
            return org

    # Substring match
    for org in orgs:
        all_names = [org.name] + (org.aliases or [])
        if any(text_lower in n.lower() or n.lower() in text_lower for n in all_names):
            return org

    # Fuzzy match — best ratio above threshold
    best_ratio = 0.0
    best_org: Organization | None = None
    for org in orgs:
        all_names = [org.name] + (org.aliases or [])
        for name in all_names:
            ratio = _similarity(text, name)
            if ratio > best_ratio:
                best_ratio = ratio
                best_org = org

    return best_org if best_ratio >= 0.55 else None


async def _complete_onboarding_no_org(
    *,
    session: OnboardingSession,
    channel: Channel,
    external_id: str,
    tg_username: str | None,
    db: AsyncSession,
) -> None:
    """Complete onboarding when org couldn't be identified — chat visible to all employees."""
    data = session.collected_data
    org_text = data.get("org_text", "")

    profile = ClientProfile(
        full_name=data.get("name"),
        iin=data.get("iin"),
        organization_id=None,
        channel=channel,
        onboarding_step=OnboardingStep.done,
        onboarding_data={},
        assigned_employee_id=None,
    )
    if channel == Channel.whatsapp:
        profile.whatsapp_phone = external_id
    else:
        profile.telegram_user_id = int(external_id)
        profile.telegram_username = tg_username

    db.add(profile)
    await db.flush()

    chat = ExternalChat(
        client_profile_id=profile.id,
        assigned_employee_id=None,
        channel=channel,
        status=ChatStatus.active,
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(chat)
    await db.flush()

    if org_text:
        db.add(ExternalMessage(
            chat_id=chat.id,
            direction=MessageDirection.incoming,
            message_type=MessageType.text,
            content=org_text,
        ))

    await db.delete(session)
    await db.commit()
    await db.refresh(chat)

    ws_payload = {
        "type": "client:onboarding:done",
        "chatId": chat.id,
        "clientId": profile.id,
        "clientName": profile.full_name,
        "channel": channel.value,
    }
    # Notify all active employees and admins
    all_users = (await db.scalars(
        select(User).where(User.is_active == True)  # noqa: E712
    )).all()
    for u in all_users:
        await manager.send_to_user(u.id, ws_payload)


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

    # Notify all employees in the org (not just the assigned one)
    org_employees = (await db.scalars(
        select(User)
        .join(user_organizations, user_organizations.c.user_id == User.id)
        .where(
            user_organizations.c.organization_id == org.id,
            User.is_active == True,  # noqa: E712
        )
    )).all()
    notified: set[int] = set()
    for emp in org_employees:
        await manager.send_to_user(emp.id, {
            "type": "client:onboarding:done",
            "chatId": chat.id,
            "clientId": profile.id,
            "clientName": profile.full_name,
            "channel": channel.value,
        })
        notified.add(emp.id)
    # Also notify assigned employee if not already notified (e.g. admin fallback)
    if employee and employee.id not in notified:
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
        select(User)
        .join(user_organizations, user_organizations.c.user_id == User.id)
        .where(
            User.role == UserRole.employee,
            User.is_active == True,  # noqa: E712
            user_organizations.c.organization_id == org_id,
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

    file_payload = None
    if file_id:
        from app.models.file import File as FileModel
        f = await db.get(FileModel, file_id)
        if f:
            file_payload = {
                "id": f.id,
                "originalName": f.original_name,
                "mimeType": f.mime_type,
                "url": f"/uploads/{f.stored_path}",
            }

    ws_payload = {
        "type": "external:message:new",
        "chatId": chat.id,
        "message": {
            "id": msg.id,
            "direction": "in",
            "messageType": message_type.value,
            "content": text,
            "file": file_payload,
            "sentAt": msg.sent_at.isoformat(),
        },
    }

    # Notify assigned employee
    notified: set[int] = set()
    if chat.assigned_employee_id:
        await manager.send_to_user(chat.assigned_employee_id, ws_payload)
        notified.add(chat.assigned_employee_id)

    # Also notify employees who belong to the client's organization
    if profile.organization_id:
        org_employees = (await db.scalars(
            select(User)
            .join(user_organizations, user_organizations.c.user_id == User.id)
            .where(
                user_organizations.c.organization_id == profile.organization_id,
                User.is_active == True,  # noqa: E712
            )
        )).all()
        for emp in org_employees:
            if emp.id not in notified:
                await manager.send_to_user(emp.id, ws_payload)
                notified.add(emp.id)
