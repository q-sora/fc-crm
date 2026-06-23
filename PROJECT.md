# FC CRM — Описание проекта

## Суть проекта

Корпоративная CRM-система **FC CRM** для работы с клиентами через WhatsApp и Telegram, с встроенным внутренним мессенджером для сотрудников. Сотрудники видят все входящие обращения в едином интерфейсе, могут посмотреть профиль клиента (ФИО, ИИН, организация), ответить через нужный канал и общаться между собой во внутреннем чате.

---

## Пользовательские роли

| Роль | Возможности |
|------|-------------|
| **Admin** | Регистрация сотрудников, назначение организаций, просмотр всех чатов, управление архивом, управление организациями и клиентами |
| **Employee** | Ведение чатов из WA/TG, просмотр и редактирование профилей клиентов (организация), внутренний чат с коллегами, шаблонные фразы |

Регистрация новых пользователей — **только через аккаунт администратора**.

---

## Каналы коммуникации с клиентами

### WhatsApp Bot (Baileys — Node.js микросервис)
- Приём текстовых сообщений и файлов (фото, видео, документы, аудио)
- Файлы с подписью (`documentWithCaptionMessage`) — поддерживаются
- При первом обращении запускает онбординг (см. ниже)
- Передаёт все события в FastAPI backend через HTTP webhook
- При `@lid` JID (новый формат WhatsApp) — пытается резолвить в реальный номер через `contacts.upsert`; если не удаётся — поле телефона не отображается

### Telegram Bot (aiogram 3 — Python, в составе backend)
- Приём текстовых сообщений и файлов
- При первом обращении запускает тот же онбординг
- Работает через Telegram Bot API

### Онбординг нового клиента (единый для WA и TG)

```
[Любое первое сообщение]
          │
          ▼
   [приветствие] → Бот: "Добро пожаловать в FC CRM! Введите ваше ФИО."
          │
          ▼
   [ask_name]   → Принимает ФИО
          │
          ▼
   [ask_iin]    → Бот: "Введите ваш ИИН (12 цифр)"
          │         Игнорирует пробелы и тире при вводе
          ▼
   [ask_org]    → Бот: "Укажите вашу организацию / учебное заведение"
          │         Нечёткое совпадение (difflib, порог 0.55)
          │         Проверяет основное название + псевдонимы (aliases)
          │         2 попытки — на 2-й неудаче: чат виден всем сотрудникам
          ▼
   [done]       → Создаётся client_profile (ФИО + ИИН + организация)
                  → Чат привязывается к сотруднику с наименьшей нагрузкой
                  → Сотруднику приходит уведомление (WS + звук)
                  → Бот: "Спасибо! Ваш вопрос передан специалисту."
```

**Особые случаи:**
- Организация не найдена за 2 попытки → чат без организации, виден **всем** активным сотрудникам
- Нераспознанная организация сохраняется первым сообщением чата
- Сотрудник может вручную указать/изменить организацию в профиле клиента

---

## Веб-приложение FC CRM (React)

### Раздел 1: Чаты с клиентами
- Список всех входящих чатов (WA + TG) с иконкой канала
- Непрочитанные сообщения: счётчик + прокрутка к первому непрочитанному при открытии
- Звуковое уведомление при новом сообщении (`/sounds/notification.mp3`)
- Нераспределённые чаты (без ответственного) видны всем сотрудникам
- **Боковая панель профиля клиента:**
  - ФИО, ИИН, организация (с возможностью изменить)
  - Канал (WhatsApp / Telegram)
  - Телефон (только для WA, если удалось получить реальный номер)
  - Telegram username
  - Дата первого обращения
- Окно переписки: текст + файлы (фото, видео, документы, аудио)
- Отправка текста и файлов обратно в WA или TG
- **Drag & drop** файлов в поле ввода
- Шаблонные фразы — **мгновенная отправка** по клику (без вставки в поле)
- Кнопка «Архивировать чат»

### Раздел 2: Внутренние чаты
- Переписка между сотрудниками (личные + групповые чаты)
- Отправка файлов, drag & drop
- Звуковое уведомление (всегда, т.к. WS не отправляет эхо отправителю)

### Раздел 3: Архив
- Архивированные внешние чаты (только чтение)
- Разархивирование чата

### Раздел 4: Админ-панель
- Управление сотрудниками: создание, активация/деактивация, назначение организаций
- Управление организациями: создание с псевдонимами через `|` (напр. `КазНУ|Казахский национальный`)
- Управление клиентами: просмотр, **удаление** (каскадно удаляет чаты и файлы, кроме файлов пересланных в другие чаты)
- Управление шаблонными фразами

---

## Технологический стек

### Backend — `Python + FastAPI`
| Компонент | Технология |
|-----------|-----------|
| Веб-фреймворк | **FastAPI** (async, WebSockets) |
| ORM | **SQLAlchemy 2.0** (async + asyncpg) |
| Миграции БД | **Alembic** |
| Telegram-бот | **aiogram 3** (запускается внутри FastAPI lifespan) |
| Real-time | **WebSockets** (FastAPI native) |
| Аутентификация | **JWT** (python-jose) + bcrypt |
| Загрузка файлов | FastAPI `UploadFile` + `aiofiles` |
| Валидация | **Pydantic v2** |
| HTTP-клиент | **httpx** (общение с WA-bridge, с retry при ConnectError/ReadTimeout) |
| Нечёткий поиск | **difflib.SequenceMatcher** (stdlib, без доп. зависимостей) |

### WhatsApp Bridge — `Node.js микросервис`
| Компонент | Технология |
|-----------|-----------|
| WhatsApp API | **@whiskeysockets/baileys 6.7.x** |
| HTTP-клиент | **axios** (вебхуки в FastAPI + загрузка медиа) |
| Сервер | **express** (принимает команды от FastAPI) |
| Логгер | **pino** (уровень `warn` — подавляет verbose Baileys output) |

**Особенности wa-bridge:**
- `defaultQueryTimeoutMs: undefined` — без таймаута на init queries
- `connectTimeoutMs: 60_000`, `keepAliveIntervalMs: 15_000`
- Медиафайлы: `downloadMediaMessage` → загрузка в `/internal/files/upload`
- Поддержка `@lid` JID (новый формат WhatsApp): маппинг через `contacts.upsert`
- Разделение модулей: `socket.js` (синглтон), `store.js` (LID→phone map), `webhook.js`, `sender.js`

### Frontend — `React + TypeScript`
| Технология | Назначение |
|------------|-----------|
| React 18 + TypeScript | UI |
| Vite | Сборщик |
| TanStack Query (React Query) | Серверный стейт, кэш |
| Zustand | Глобальный стейт (чаты, непрочитанные, activeNavPage) |
| React Router v6 | Навигация |
| CSS Modules | Стилизация |
| SVG-компоненты | Иконки (без emoji, без иконочных шрифтов) |

### База данных — `PostgreSQL 16` (Docker)

### Хранилище файлов
- Docker volume `uploads_data`, монтируется в `/app/uploads`
- Отдаётся как static через nginx `/uploads/...`

---

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Compose                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │  Frontend   │    │    Backend      │    │   PostgreSQL   │  │
│  │ React/Nginx │◄──►│    FastAPI      │◄──►│   Port 5432    │  │
│  │  Port 80    │    │    Port 8000    │    └────────────────┘  │
│  └─────────────┘    │  + aiogram 3   │                        │
│                      │  (Telegram)    │    ┌────────────────┐  │
│                      └────────┬───────┘    │ uploads volume │  │
│                               │            └────────────────┘  │
│                      ┌────────▼───────┐                        │
│                      │   WA Bridge    │                        │
│                      │   Node.js      │◄──► WhatsApp Web       │
│                      │   Port 3001    │                        │
│                      └────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Взаимодействие backend ↔ WA-bridge
```
Входящее WA сообщение + медиа:
  WhatsApp → WA-bridge (Baileys)
    → downloadMediaMessage → POST /internal/files/upload → file_id
    → POST /internal/wa-webhook { event, data: { phone, file_id, ... } }
    → FastAPI → onboarding FSM / сохранение сообщения → WS клиентам

Исходящее WA сообщение:
  FastAPI → POST http://wa-bridge:3001/send → WA-bridge → WhatsApp
  (retry до 2 раз при ConnectError/ReadTimeout, пауза 3с)
```

---

## Схема базы данных

```sql
-- Сотрудники системы FC CRM
users
  id, email, password_hash, name, role (admin|employee),
  is_active, created_at

-- Связь сотрудник ↔ организации (many-to-many)
user_organizations
  user_id, organization_id

-- Организации / учебные заведения
organizations
  id, name,
  aliases (jsonb, default []),  -- альтернативные названия для поиска
  created_at

-- Профили клиентов (из WA и TG)
client_profiles
  id, full_name, iin, organization_id,
  whatsapp_phone,       -- JID: может быть '79001234567@s.whatsapp.net' или '...@lid'
  telegram_user_id,
  telegram_username,
  channel (whatsapp|telegram),
  onboarding_step (ask_name|ask_iin|ask_org|done),
  onboarding_data (jsonb),
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
  wa_message_id, tg_message_id,
  is_forwarded,
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

-- Файлы (загруженные сотрудниками + полученные от клиентов)
files
  id, original_name, stored_path, mime_type, size,
  uploaded_by (nullable — NULL для файлов от WA-bridge),
  created_at

-- Шаблонные фразы
quick_phrases
  id, title, body, created_by, created_at

-- Временные сессии онбординга (до завершения)
onboarding_sessions
  id, channel (whatsapp|telegram),
  external_id,        -- JID (WA) или telegram_user_id (TG)
  step (ask_name|ask_iin|ask_org),
  collected_data (jsonb),  -- name, iin, org_attempts, org_text
  started_at
```

---

## Структура проекта

```
whatsapp-crm/
├── docker-compose.yml
├── .env
├── PROJECT.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/
│   │   ├── 0001_initial.py
│   │   ├── 0002_user_organizations.py
│   │   ├── 0003_...py
│   │   └── 0004_org_aliases.py
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       │   ├── user.py
│       │   ├── organization.py        # aliases: JSONB
│       │   ├── client_profile.py
│       │   ├── external_chat.py
│       │   ├── external_message.py
│       │   ├── internal_chat.py
│       │   ├── internal_message.py
│       │   ├── file.py
│       │   ├── quick_phrase.py
│       │   └── onboarding_session.py
│       ├── schemas/
│       ├── api/
│       │   ├── auth.py
│       │   ├── users.py
│       │   ├── organizations.py       # парсинг | для псевдонимов
│       │   ├── external_chats.py      # нераспределённые чаты видны всем
│       │   ├── internal_chats.py
│       │   ├── files.py
│       │   ├── quick_phrases.py
│       │   ├── client_profiles.py     # DELETE с каскадом и защитой файлов
│       │   ├── deps.py
│       │   └── wa_webhook.py          # POST /internal/wa-webhook
│       │                              # POST /internal/files/upload (для WA-bridge)
│       ├── services/
│       │   ├── onboarding.py          # FSM: приветствие → ФИО → ИИН → орг → done
│       │   ├── whatsapp.py            # httpx с retry
│       │   └── telegram_out.py
│       ├── telegram/
│       │   ├── bot.py
│       │   └── handlers.py
│       └── websocket/
│           ├── gateway.py
│           └── manager.py
│
├── wa-bridge/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js      # Express: POST /send, GET /health
│       ├── whatsapp.js   # Baileys: подключение, contacts.upsert listener
│       ├── socket.js     # Синглтон сокета (избегает circular deps)
│       ├── store.js      # LID→phone маппинг через contacts.upsert
│       ├── webhook.js    # Входящие: парсинг, скачивание медиа, отправка в FastAPI
│       └── sender.js     # Исходящие: sendMessage (текст + файлы)
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── ExternalChatsPage.tsx   # scrollSignal, unreadAtOpenRef
        │   ├── InternalChatsPage.tsx
        │   ├── ArchivePage.tsx
        │   └── AdminPage.tsx           # сотрудники, орги, клиенты, фразы
        ├── components/
        │   ├── ChatWindow/             # separatorRef, isNearBottom scroll
        │   ├── ClientProfile/          # cleanPhone(), org selector для workers
        │   ├── MessageInput/           # drag&drop, мгновенная отправка фраз
        │   ├── Sidebar/
        │   └── ErrorBoundary/
        ├── store/
        │   └── chatStore.ts            # activeNavPage, unreadExternal/Internal
        ├── api/
        ├── socket/
        │   └── useWsEvents.ts          # звук, подавление звука по activeNavPage
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
POST   /organizations          [admin] — парсит | для псевдонимов

# Профили клиентов
GET    /clients/{id}
PATCH  /clients/{id}           — изменение organization_id (workers)
DELETE /clients/{id}           [admin] — каскадное удаление

# Внешние чаты
GET    /external/chats         ?status=active|archived
GET    /external/chats/{id}/messages
POST   /external/chats/{id}/send
POST   /external/chats/{id}/archive
POST   /external/chats/{id}/unarchive
GET    /external/archive

# Внутренние чаты
GET    /internal/chats
POST   /internal/chats
GET    /internal/chats/{id}/messages
POST   /internal/chats/{id}/send

# Файлы
POST   /files/upload               — JWT auth (сотрудники)
GET    /files/{id}
POST   /internal/files/upload      — Bearer bridge token (WA-bridge медиа)

# Шаблонные фразы
GET    /quick-phrases
POST   /quick-phrases
DELETE /quick-phrases/{id}

# Внутренний webhook (WA-bridge → FastAPI)
POST   /internal/wa-webhook        — Bearer WA_BRIDGE_TOKEN

# WebSocket
WS     /ws?token=<jwt>
```

### WebSocket события (сервер → клиент)
```json
{ "type": "external:message:new",   "chatId": 1, "message": {...} }
{ "type": "internal:message:new",   "chatId": 5, "message": {...} }
{ "type": "client:onboarding:done", "chatId": 1, "clientId": 12, "channel": "whatsapp" }
```

---

## Переменные окружения (.env)

```env
POSTGRES_PASSWORD=strong_password_here
JWT_SECRET=your-very-secret-key-min-32-chars
WA_BRIDGE_TOKEN=internal-secret-between-services
TELEGRAM_BOT_TOKEN=123456789:AABBCCDDEEFFaabbccddeeff
```

---

## Деплой и обслуживание

```bash
# Первый запуск
docker compose up -d --build
docker compose exec backend alembic upgrade head

# После изменения Python-кода (без изменений в requirements.txt)
docker compose cp backend/app/... backend:/app/app/...
docker compose restart backend

# После изменений в Node.js или requirements.txt
docker compose build <service>
docker compose up -d <service>

# Миграция БД после изменений моделей
docker compose exec backend alembic upgrade head

# Логи
docker compose logs -f wa-bridge
docker compose logs -f backend
```

## Известные ограничения

- **`@lid` JID**: WhatsApp с 2024 использует privacy-JID (`@lid`) вместо номера телефона для незнакомых контактов. Реальный номер доступен только если контакт сохранён в адресной книге телефона, к которому привязан бот. Поле «Телефон» скрывается если номер не удалось определить.
- **Звук уведомлений**: файл `notification.mp3` необходимо положить вручную в `frontend/public/sounds/notification.mp3` и пересобрать фронтенд.
- **Baileys сессия**: при разрыве соединения бот переподключается автоматически (retry через 3с). При полном выходе из аккаунта (`loggedOut`) нужно пересканировать QR.
