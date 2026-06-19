import asyncio
from aiogram import Bot, Dispatcher

from app.config import settings

# Created at import time so handlers.py can decorate @dp.message at import time
dp = Dispatcher()
bot: Bot | None = None


async def start_bot():
    global bot
    bot = Bot(token=settings.telegram_bot_token)

    # Import handlers after dp is ready — registers all @dp.message decorators
    import app.telegram.handlers  # noqa: F401

    asyncio.create_task(dp.start_polling(bot, handle_signals=False))


async def stop_bot():
    if bot:
        await bot.session.close()
