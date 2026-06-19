from aiogram import Bot, Dispatcher

from app.config import settings

bot: Bot | None = None
dp: Dispatcher | None = None


async def start_bot():
    global bot, dp
    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()
    # handlers registered in handlers.py
    from app.telegram import handlers  # noqa: F401
    import asyncio
    asyncio.create_task(dp.start_polling(bot))


async def stop_bot():
    if bot:
        await bot.session.close()
