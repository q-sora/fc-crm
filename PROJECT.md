# FC CRM — Описание проекта

## Суть проекта

Корпоративная CRM-система **FC CRM** для работы с клиентами через WhatsApp и Telegram, с встроенным внутренним мессенджером для сотрудников. Сотрудники видят все входящие обращения в едином интерфейсе, могут посмотреть профиль клиента (ФИО, ИИН, организация), ответить через нужный канал и общаться между собой во внутреннем чате.

---

## Пользовательские роли

| Роль | Возможности |
|------|-------------|
| **Admin** | Регистрация сотрудников, назначение организаций, просмотр всех чатов, управление архивом |
| **Employee** | Ведение чатов из WA/TG, просмотр профилей клиентов, внутренний чат с коллегами, шаблонные фразы |

Регистрация новых пользователей — **только через аккаунт администратора**.

---

## Каналы коммуникации с клиентами

### WhatsApp Bot (Baileys — Node.js микросервис)
- Приём текстовых сообщений и файлов (фото, документы, голосовые)
- При первом обращении запускает онбординг (см. ниже)
- Передаёт все события в FastAPI backend через HTTP webhook

### Telegram Bot (aiogram 3 — Python, в составе backend)
- Приём текстовых сообщений и файлов
- При первом обращении запускает тот же онбординг
- Работает через Telegram Bot API

### Онбординг нового клиента (единый для WA и TG)

```
[Первое сообщение с нового номера/аккаунта]
          │
          ▼
   [ask_name]  → Бот: "Добро пожаловать в FC CRM! Введите ваше ФИО"
          │
          ▼
    [ask_iin]  → Бот: "Введите ваш ИИН (12 цифр)"
          │           (валидация: ровно 12 цифр)
          ▼
    [ask_org]  → Бот: "Укажите ваше учебное заведение / организацию"
          │
          ▼
     [done]    → Создаётся client_profile (ФИО + ИИН + организация)
                 → Чат привязывается к ответственному сотруднику
                 → Сотруднику приходит уведомление в FC CRM
                 → Бот: "Спасибо! Ваш вопрос передан специалисту."
```

---

## Веб-приложение FC CRM (React)

### Раздел 1: Чаты с клиентами (`/chats/external`)
- Список всех входящих чатов (WA + TG) с пометкой канала
- Иконка канала рядом с именем (WhatsApp / Telegram)
- **Клик по пользователю → боковая панель с профилем клиента:**
  - ФИО
  - ИИН
  - Организация / учебное заведение
  - Канал (WhatsApp / Telegram)
  - Телефон (для WA) / Telegram username
  - Дата первого обращения
- Окно переписки с историей сообщений
- Отправка текста и файлов обратно в WA или TG
- Библиотека шаблонных фраз (быстрые ответы)
- Кнопка «Архивировать чат»

### Раздел 2: Внутренние чаты (`/chats/internal`)
- Переписка между сотрудниками (личные + групповые чаты)
- Отправка файлов
- Поиск по сообщениям

### Раздел 3: Архив (`/chats/archive`)
- Архивированные внешние чаты (только чтение)
- Фильтрация: по дате, организации, каналу, сотруднику
- Клик по пользователю — тот же профиль клиента

---

## Технологический стек

### Backend — `Python + FastAPI`
| Компонент | Технология |
|-----------|-----------|
| Веб-фреймворк | **FastAPI** (async, WebSockets, OpenAPI из коробки) |
| ORM | **SQLAlchemy 2.0** (async) |
| Миграции БД | **Alembic** |
| Telegram-бот | **aiogram 3** (запускается внутри FastAPI процесса) |
| Real-time | **WebSockets** (FastAPI native) или **Socket.io** через `python-socketio` |
| Аутентификация | **JWT** (python-jose) + bcrypt |
| Загрузка файлов | FastAPI `UploadFile` + `aiofiles` |
| Валидация | **Pydantic v2** |
| HTTP-клиент | **httpx** (для общения с WA-bridge) |

### WhatsApp Bridge — `Node.js микросервис`
| Компонент | Технология |
|-----------|-----------|
| WhatsApp API | **@whiskeysockets/baileys** |
| HTTP-клиент | axios (отправляет события в FastAPI) |
| Сервер | express (принимает команды от FastAPI — отправить сообщение) |

> **Почему отдельный Node.js сервис для WA?**  
> Baileys — единственная надёжная библиотека для WhatsApp Web API, она работает только на Node.js. FastAPI общается с ней через HTTP: WA-bridge шлёт вебхуки в Python, Python шлёт команды в WA-bridge.

### Frontend — `React + TypeScript`
| Технология | Назначение |
|------------|-----------|
| React 18 + TypeScript | UI |
| Vite | Сборщик |
| React Query (TanStack) | Серверный стейт, кэш |
| WebSocket / Socket.io client | Real-time обновления |
| React Router v6 | Навигация |
| Zustand | Глобальный стейт |
| Tailwind CSS | Стилизация |

### База данных — `PostgreSQL 16` (Docker)

### Хранилище файлов
- Docker volume `uploads_data`, монтируется в `/app/uploads`
- FastAPI отдаёт файлы как static или через endpoint `/files/:id`

---

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Compose                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  Frontend   │    │   Backend       │    │   PostgreSQL   │  │
│  │ React/Nginx │◄──►│   FastAPI       │◄──►│   Port 5432    │  │
│  │  Port 80    │    │   Port 8000     │    └────────────────┘  │
│  └─────────────┘    │   + aiogram     │                        │
│                      │   (Telegram)    │    ┌────────────────┐  │
│                      └────────┬────────┘    │ uploads volume │  │
│                               │             └────────────────┘  │
│                      ┌────────▼────────┐                        │
│                      │  WA Bridge      │                        │
│                      │  Node.js        │◄──► WhatsApp Web       │
│                      │  Port 3001      │                        │
│                      └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Взаимодействие backend ↔ WA-bridge
```
Входящее WA сообщение:
  WA-bridge  →  POST /internal/wa-webhook  →  FastAPI  →  WS клиентам

Исходящее WA сообщение:
  FastAPI  →  POST http://wa-bridge:3001/send  →  WA-bridge  →  WhatsApp
```

---

## Схема базы данных

```sql
-- Сотрудники системы FC CRM
users
  id, email, password_hash, name, role (admin|employee),
  organization_id, is_active, created_at

-- Организации / учебные заведения
organizations
  id, name, created_at

-- Профили клиентов (из WA и TG)
client_profiles
  id, full_name, iin, organization_id,
  whatsapp_phone,      -- NULL если клиент только из TG
  telegram_user_id,    -- NULL если клиент только из WA
  telegram_username,
  channel (whatsapp|telegram),
  onboarding_step (ask_name|ask_iin|ask_org|done),
  onboarding_data (jsonb),   -- временное хранение во время онбординга
  assigned_employee_id,
  created_at

-- Внешние чаты (WA + TG клиенты)
external_chats
  id, client_profile_id, assigned_employee_id,
  channel (whatsapp|telegram),
  status (active|archived),
  last_message_at, created_at

-- Сообщения внешних чатов
external_messages
  id, chat_id, direction (in|out),
  message_type (text|image|document|audio|video),
  content, file_id,
  wa_message_id,       -- id из WhatsApp (для дедупликации)
  tg_message_id,       -- id из Telegram
  sent_at

-- Внутренние чаты (сотрудник ↔ сотрудник)
internal_chats
  id, type (direct|group), name, created_at

internal_chat_members
  chat_id, user_id, joined_at

internal_messages
  id, chat_id, sender_id, content,
  message_type (text|image|document),
  file_id, sent_at

-- Файлы
files
  id, original_name, stored_path, mime_type, size,
  uploaded_by, created_at

-- Шаблонные фразы
quick_phrases
  id, title, body, created_by, created_at

-- Временные сессии онбординга (до завершения)
onboarding_sessions
  id, channel (whatsapp|telegram),
  external_id,   -- phone (WA) или telegram_user_id
  step, collected_data (jsonb), started_at
```

---

## Структура проекта

```
fc-crm/
├── docker-compose.yml
├── .env.example
├── PROJECT.md
│
├── backend/                        # Python FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/migrations/
│   └── app/
│       ├── main.py                 # FastAPI app, lifespan
│       ├── config.py               # Settings (pydantic-settings)
│       ├── database.py             # SQLAlchemy async engine
│       ├── models/                 # SQLAlchemy модели
│       ├── schemas/                # Pydantic схемы (request/response)
│       ├── api/
│       │   ├── auth.py             # POST /auth/login, /logout
│       │   ├── users.py            # CRUD сотрудников (admin only)
│       │   ├── organizations.py
│       │   ├── external_chats.py   # WA+TG чаты, архивирование
│       │   ├── internal_chats.py   # Внутренний мессенджер
│       │   ├── messages.py
│       │   ├── files.py
│       │   ├── quick_phrases.py
│       │   ├── client_profiles.py  # GET профиль клиента (ФИО, ИИН)
│       │   └── wa_webhook.py       # Внутренний webhook от WA-bridge
│       ├── services/
│       │   ├── onboarding.py       # FSM онбординга (WA + TG)
│       │   ├── whatsapp.py         # HTTP-клиент к WA-bridge
│       │   ├── notifications.py    # WS уведомления сотрудникам
│       │   └── files.py
│       ├── telegram/
│       │   ├── bot.py              # aiogram Dispatcher
│       │   └── handlers.py         # Обработчики TG сообщений
│       └── websocket/
│           └── gateway.py          # WS endpoint /ws
│
├── wa-bridge/                      # Node.js WhatsApp микросервис
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                # Express сервер
│       ├── whatsapp.js             # Baileys подключение
│       ├── webhook.js              # Отправка событий в FastAPI
│       └── sender.js               # Приём команд от FastAPI, отправка в WA
│
└── frontend/                       # React
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── ExternalChatsPage.tsx   # WA + TG чаты
        │   ├── InternalChatsPage.tsx
        │   └── ArchivePage.tsx
        ├── components/
        │   ├── ChatList/
        │   │   └── ChatListItem.tsx    # Иконка канала + имя
        │   ├── ChatWindow/
        │   ├── ClientProfile/          # Боковая панель: ФИО, ИИН, орг.
        │   ├── MessageInput/           # Текст + файл + шаблоны
        │   ├── QuickPhrases/
        │   └── AdminPanel/
        ├── store/
        │   ├── authStore.ts
        │   └── chatStore.ts
        ├── api/                        # React Query hooks + axios
        ├── socket/                     # WebSocket клиент
        └── types/
            └── index.ts
```

---

## Ключевые API-эндпоинты (FastAPI)

```
# Auth
POST   /auth/login
POST   /auth/logout

# Сотрудники (только admin)
GET    /users
POST   /users
PATCH  /users/{id}
DELETE /users/{id}

# Организации
GET    /organizations
POST   /organizations          [admin]

# Профили клиентов
GET    /clients/{id}           # ФИО, ИИН, организация, канал, телефон/tg

# Внешние чаты (WA + TG)
GET    /external/chats         # ?channel=whatsapp|telegram&status=active|archived
GET    /external/chats/{id}/messages
POST   /external/chats/{id}/send     # { content, file_id? }
POST   /external/chats/{id}/archive
GET    /external/archive

# Внутренние чаты
GET    /internal/chats
POST   /internal/chats
GET    /internal/chats/{id}/messages
POST   /internal/chats/{id}/send

# Файлы
POST   /files/upload
GET    /files/{id}

# Шаблонные фразы
GET    /quick-phrases
POST   /quick-phrases
DELETE /quick-phrases/{id}

# Внутренний webhook (WA-bridge → FastAPI, не открыт наружу)
POST   /internal/wa-webhook    # Bearer внутренний токен

# WebSocket
WS     /ws                     # ?token=<jwt>
```

### WebSocket события (сервер → клиент)
```json
{ "type": "external:message:new",  "chatId": 1, "message": {...} }
{ "type": "external:chat:new",     "chat": {...} }
{ "type": "internal:message:new",  "chatId": 5, "message": {...} }
{ "type": "client:onboarding:done","clientId": 12, "chatId": 1 }
```

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: fc_crm
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d fc_crm"]
      interval: 5s
      retries: 10

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://crm_user:${POSTGRES_PASSWORD}@postgres:5432/fc_crm
      JWT_SECRET: ${JWT_SECRET}
      WA_BRIDGE_URL: http://wa-bridge:3001
      WA_BRIDGE_TOKEN: ${WA_BRIDGE_TOKEN}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads_data:/app/uploads
    ports:
      - "8000:8000"

  wa-bridge:
    build: ./wa-bridge
    environment:
      FASTAPI_URL: http://backend:8000
      FASTAPI_WEBHOOK_TOKEN: ${WA_BRIDGE_TOKEN}
    volumes:
      - wa_session:/app/.baileys_session
    ports:
      - "3001:3001"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
  uploads_data:
  wa_session:
```

---

## Переменные окружения (.env)

```env
# PostgreSQL
POSTGRES_PASSWORD=strong_password_here

# Backend
JWT_SECRET=your-very-secret-key-min-32-chars
WA_BRIDGE_TOKEN=internal-secret-between-services

# Telegram
TELEGRAM_BOT_TOKEN=123456789:AABBCCDDEEFFaabbccddeeff

# WA Bridge
# (используется FASTAPI_URL и FASTAPI_WEBHOOK_TOKEN из docker-compose)

# Frontend (Vite build-time)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## Профиль клиента в UI

При клике на пользователя в списке чатов (неважно WA или TG) — справа открывается панель:

```
┌─────────────────────────────┐
│  👤 Иванов Иван Иванович    │
│  ─────────────────────────  │
│  ИИН:       123456789012    │
│  Организация: КазНУ         │
│  Канал:    📱 WhatsApp      │
│  Телефон:  +7 700 000 00 00 │
│  Первое обращение: 12.06.26 │
│  Сотрудник: Петрова А.      │
└─────────────────────────────┘
```

---

## Порядок разработки (этапы)

1. **Инфраструктура** — `docker-compose.yml`, `.env`, PostgreSQL healthcheck
2. **Backend: БД** — SQLAlchemy модели, Alembic миграции, `alembic upgrade head`
3. **Backend: Auth + Users** — JWT, bcrypt, роли admin/employee, seed admin
4. **Backend: Organizations + ClientProfiles** — CRUD, endpoint профиля клиента
5. **Backend: Telegram-бот** — aiogram 3, онбординг FSM, приём сообщений
6. **WA-bridge** — Baileys, scan QR, вебхук в FastAPI, endpoint /send
7. **Backend: WA webhook + External chats** — обработка входящих WA
8. **Backend: Файлы** — загрузка, хранение, отдача
9. **Backend: Internal chats** — сотрудник ↔ сотрудник
10. **Backend: Quick phrases** — CRUD шаблонных фраз
11. **Backend: WebSocket gateway** — real-time уведомления
12. **Frontend: Auth** — страница входа, JWT в localStorage, guard роутинг
13. **Frontend: External chats** — список (WA+TG иконки), окно, профиль клиента
14. **Frontend: Internal chats** — внутренний мессенджер
15. **Frontend: Архив** — просмотр архивированных чатов
16. **Frontend: Шаблоны + Admin панель** — управление фразами, создание сотрудников
17. **End-to-end тестирование** — онбординг WA, онбординг TG, отправка файлов
