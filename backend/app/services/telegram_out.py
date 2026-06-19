from aiogram.types import FSInputFile

from app.telegram.bot import bot
from app.config import settings
import os


async def send_tg_text(tg_user_id: int, text: str) -> None:
    await bot.send_message(chat_id=tg_user_id, text=text)


async def send_tg_file(tg_user_id: int, stored_name: str, original_name: str, mime_type: str, caption: str = "") -> None:
    path = os.path.join(settings.upload_dir, stored_name)
    file = FSInputFile(path, filename=original_name)

    if mime_type.startswith("image/"):
        await bot.send_photo(chat_id=tg_user_id, photo=file, caption=caption or None)
    elif mime_type.startswith("audio/"):
        await bot.send_audio(chat_id=tg_user_id, audio=file, caption=caption or None)
    elif mime_type.startswith("video/"):
        await bot.send_video(chat_id=tg_user_id, video=file, caption=caption or None)
    else:
        await bot.send_document(chat_id=tg_user_id, document=file, caption=caption or None)
