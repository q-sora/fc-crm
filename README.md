# FC CRM

CRM-система для работы с клиентами через WhatsApp и Telegram. Сотрудники получают входящие обращения в едином интерфейсе, видят профиль клиента и могут общаться внутри команды.

## Возможности

- Приём сообщений и файлов из WhatsApp (Baileys) и Telegram
- Автоматический онбординг нового клиента: ФИО → ИИН → организация
- Назначение чата на сотрудника с наименьшей нагрузкой
- Внутренний чат между сотрудниками
- Профиль клиента с организацией, ИИН, каналом
- Drag & drop загрузка файлов, шаблонные фразы
- Звуковые уведомления о новых сообщениях
- Архив чатов
- Админ-панель: сотрудники, организации, клиенты, фразы

## Требования

- Docker Desktop
- Токен Telegram-бота ([получить у @BotFather](https://t.me/BotFather))
- Телефон с WhatsApp для сканирования QR

## Быстрый старт

**1. Скопируй `.env.example` и заполни:**

```bash
cp .env.example .env
```

```env
POSTGRES_PASSWORD=your_strong_password
JWT_SECRET=your-very-secret-key-min-32-chars
WA_BRIDGE_TOKEN=any-random-secret-string
TELEGRAM_BOT_TOKEN=123456789:AABBCCDDEEFFaabbccddeeff
```

**2. Собери и запусти:**

```bash
docker compose up -d --build

# Подождать пока PostgreSQL поднимется, затем:
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seeds.seed_admin
docker compose exec backend python -m app.seeds.seed_employees
```

> Или одной командой: `bash init.sh` — сам дождётся PostgreSQL и выполнит всё по порядку.

**3. Открой [http://localhost](http://localhost) и войди:**

```
email:    admin@fc-crm.local
password: Admin1234!
```

> Смени пароль сразу после первого входа.

**4. Подключи WhatsApp** — отсканируй QR из логов:

```bash
docker compose logs -f wa-bridge
```

## Сиды (начальные данные)

```bash
# Создать admin-аккаунт (если ещё не создан)
docker compose exec backend python -m app.seeds.seed_admin

# Загрузить сотрудников и организации
docker compose exec backend python -m app.seeds.seed_employees

# Очистить БД (admin сохраняется)
docker compose exec backend python -m app.seeds.clear_db

# Полная очистка включая admin
docker compose exec backend python -m app.seeds.clear_db --all
```

> `seed_employees.py` содержит персональные данные сотрудников и добавлен в `.gitignore` —
> файл не попадает в репозиторий, передаётся отдельно.

## Структура сервисов

```
postgres   — база данных PostgreSQL 16
backend    — FastAPI + aiogram (Telegram-бот)
wa-bridge  — Node.js + Baileys (WhatsApp)
frontend   — React + nginx (порт 80)
```

## Обновление кода

```bash
# Python-файлы без изменений в зависимостях
docker compose cp backend/app/. backend:/app/app/
docker compose restart backend

# После изменений зависимостей или Dockerfile
docker compose build <service>
docker compose up -d <service>

# Миграции БД
docker compose exec backend alembic upgrade head
```

## Детальная документация

Архитектура, схема БД, API и описание модулей — в [PROJECT.md](PROJECT.md).
