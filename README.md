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
make init
```

Команда сама соберёт все образы, дождётся PostgreSQL, применит миграции и загрузит начальные данные.

**3. Открой [http://localhost](http://localhost) и войди:**

```
email:    admin@fc-crm.local
password: Admin1234!
```

> Смени пароль сразу после первого входа.

**4. Подключи WhatsApp** — отсканируй QR из логов:

```bash
make logs-wa
```

## Makefile

Все частые операции вынесены в `make`-команды:

| Команда | Описание |
|---|---|
| `make init` | Первоначальная сборка: образы + миграции + сиды |
| `make up` | Запустить все сервисы |
| `make down` | Остановить все сервисы |
| `make ps` | Статус контейнеров |
| **Сборка** | |
| `make build-backend` | Пересобрать и перезапустить бекенд |
| `make build-frontend` | Пересобрать и перезапустить фронтенд |
| `make rebuild-backend` | То же, без кэша |
| `make rebuild-frontend` | То же, без кэша |
| **Логи** | |
| `make logs-backend` | Логи бекенда |
| `make logs-frontend` | Логи фронтенда |
| `make logs-db` | Логи PostgreSQL |
| `make logs-wa` | Логи WhatsApp (QR-код здесь) |
| **Шелл** | |
| `make shell-backend` | Войти в контейнер бекенда |
| `make shell-db` | Войти в psql |
| **База данных** | |
| `make migrate` | Применить миграции Alembic |
| `make seed` | Загрузить начальные данные |
| `make clear-db` | Очистить БД (admin сохраняется) |
| `make reset-wa` | Сбросить сессию WhatsApp и показать новый QR |

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
# Пересобрать бекенд после изменений
make build-backend

# Пересобрать фронтенд после изменений
make build-frontend

# Применить новые миграции БД
make migrate
```

## Детальная документация

Архитектура, схема БД, API и описание модулей — в [PROJECT.md](PROJECT.md).
