from aiogram import types, F
from aiogram.filters import CommandStart

from app.telegram.bot import dp
from app.database import AsyncSessionLocal
from app.models.client_profile import Channel
from app.models.external_message import MessageType
from app.services.onboarding import handle_incoming


async def _process(message: types.Message, text: str | None, msg_type: MessageType = MessageType.text):
    user = message.from_user
    external_id = str(user.id)
    tg_username = user.username

    async with AsyncSessionLocal() as db:
        reply = await handle_incoming(
            channel=Channel.telegram,
            external_id=external_id,
            text=text,
            db=db,
            tg_username=tg_username,
            tg_message_id=message.message_id,
            message_type=msg_type,
        )

    if reply:
        await message.answer(reply)


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    # Force restart onboarding: delete existing session if any
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, delete
        from app.models.onboarding_session import OnboardingSession
        from app.models.client_profile import ClientProfile

        external_id = str(message.from_user.id)

        # Only restart if not already done
        profile = await db.scalar(
            select(ClientProfile).where(ClientProfile.telegram_user_id == message.from_user.id)
        )
        if profile:
            await message.answer("Вы уже зарегистрированы в FC CRM. Ожидайте ответа специалиста.")
            return

        await db.execute(
            delete(OnboardingSession).where(
                OnboardingSession.channel == Channel.telegram,
                OnboardingSession.external_id == external_id,
            )
        )
        await db.commit()

    from app.services.onboarding import GREET
    await message.answer(GREET)


@dp.message(F.text)
async def handle_text(message: types.Message):
    await _process(message, text=message.text)


@dp.message(F.photo)
async def handle_photo(message: types.Message):
    await _process(message, text=message.caption, msg_type=MessageType.image)


@dp.message(F.document)
async def handle_document(message: types.Message):
    await _process(message, text=message.caption, msg_type=MessageType.document)


@dp.message(F.audio | F.voice)
async def handle_audio(message: types.Message):
    await _process(message, text=None, msg_type=MessageType.audio)


@dp.message(F.video)
async def handle_video(message: types.Message):
    await _process(message, text=message.caption, msg_type=MessageType.video)
