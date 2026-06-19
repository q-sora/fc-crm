from aiogram import types

from app.telegram.bot import dp


@dp.message()
async def handle_message(message: types.Message):
    # TODO: onboarding FSM + forward to CRM
    await message.answer("FC CRM: обработка сообщения скоро будет доступна.")
