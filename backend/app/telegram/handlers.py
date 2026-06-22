import os
import uuid

from aiogram import types, F
from aiogram.filters import CommandStart

from app.telegram.bot import dp
from app.database import AsyncSessionLocal
from app.models.client_profile import Channel
from app.models.external_message import MessageType
from app.models.file import File
from app.config import settings
from app.services.onboarding import handle_incoming


async def _download_tg_file(
    message: types.Message,
    tg_file_id: str,
    original_name: str,
    mime_type: str,
) -> int | None:
    """Download Telegram file, save to disk, create File record, return DB id."""
    ext = os.path.splitext(original_name)[1] or ''
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.upload_dir, stored_name)

    try:
        tg_file = await message.bot.get_file(tg_file_id)
        await message.bot.download_file(tg_file.file_path, destination=stored_path)
    except Exception as e:
        print(f"[tg] failed to download file: {e}")
        return None

    file_size = os.path.getsize(stored_path)

    async with AsyncSessionLocal() as db:
        record = File(
            original_name=original_name,
            stored_path=stored_name,
            mime_type=mime_type,
            size=file_size,
            uploaded_by=None,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record.id


async def _process(
    message: types.Message,
    text: str | None,
    msg_type: MessageType = MessageType.text,
    file_id: int | None = None,
):
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
            file_id=file_id,
        )

    if reply:
        await message.answer(reply)


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, delete
        from app.models.onboarding_session import OnboardingSession
        from app.models.client_profile import ClientProfile

        external_id = str(message.from_user.id)

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
    photo = message.photo[-1]  # largest available size
    db_file_id = await _download_tg_file(
        message, photo.file_id, "photo.jpg", "image/jpeg"
    )
    await _process(message, text=message.caption, msg_type=MessageType.image, file_id=db_file_id)


@dp.message(F.document)
async def handle_document(message: types.Message):
    doc = message.document
    db_file_id = await _download_tg_file(
        message,
        doc.file_id,
        doc.file_name or "document",
        doc.mime_type or "application/octet-stream",
    )
    await _process(message, text=message.caption, msg_type=MessageType.document, file_id=db_file_id)


@dp.message(F.video)
async def handle_video(message: types.Message):
    video = message.video
    db_file_id = await _download_tg_file(
        message,
        video.file_id,
        video.file_name or "video.mp4",
        video.mime_type or "video/mp4",
    )
    await _process(message, text=message.caption, msg_type=MessageType.video, file_id=db_file_id)


@dp.message(F.audio)
async def handle_audio(message: types.Message):
    audio = message.audio
    db_file_id = await _download_tg_file(
        message,
        audio.file_id,
        audio.file_name or "audio.mp3",
        audio.mime_type or "audio/mpeg",
    )
    await _process(message, text=message.caption, msg_type=MessageType.audio, file_id=db_file_id)


@dp.message(F.voice)
async def handle_voice(message: types.Message):
    voice = message.voice
    db_file_id = await _download_tg_file(
        message, voice.file_id, "voice.ogg", "audio/ogg"
    )
    await _process(message, text=None, msg_type=MessageType.audio, file_id=db_file_id)


@dp.message(F.video_note)
async def handle_video_note(message: types.Message):
    vn = message.video_note
    db_file_id = await _download_tg_file(
        message, vn.file_id, "video_note.mp4", "video/mp4"
    )
    await _process(message, text=None, msg_type=MessageType.video, file_id=db_file_id)
