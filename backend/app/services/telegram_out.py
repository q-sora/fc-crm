import os

from aiogram.types import FSInputFile

import app.telegram.bot as _bot_module
from app.config import settings


async def send_tg_text(tg_user_id: int, text: str) -> None:
    await _bot_module.bot.send_message(chat_id=tg_user_id, text=text)


async def send_tg_file(tg_user_id: int, stored_name: str, original_name: str, mime_type: str, caption: str = "") -> None:
    path = os.path.join(settings.upload_dir, stored_name)
    file = FSInputFile(path, filename=original_name)
    b = _bot_module.bot

    if mime_type.startswith("image/"):
        await b.send_photo(chat_id=tg_user_id, photo=file, caption=caption or None)
    elif mime_type.startswith("audio/"):
        await b.send_audio(chat_id=tg_user_id, audio=file, caption=caption or None)
    elif mime_type.startswith("video/"):
        await b.send_video(chat_id=tg_user_id, video=file, caption=caption or None)
    else:
        await b.send_document(chat_id=tg_user_id, document=file, caption=caption or None)
