from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Create DB tables (dev only — production uses alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start Telegram bot
    from app.telegram.bot import start_bot, stop_bot
    await start_bot()

    yield

    await stop_bot()


app = FastAPI(title="FC CRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Routers (registered after models are imported so Base.metadata is populated)
from app.api import auth, users, organizations, external_chats, internal_chats, files, quick_phrases, client_profiles, wa_webhook  # noqa: E402
from app.websocket.gateway import router as ws_router  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
app.include_router(external_chats.router, prefix="/external", tags=["external-chats"])
app.include_router(internal_chats.router, prefix="/internal", tags=["internal-chats"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(quick_phrases.router, prefix="/quick-phrases", tags=["quick-phrases"])
app.include_router(client_profiles.router, prefix="/clients", tags=["clients"])
app.include_router(wa_webhook.router, prefix="/internal", tags=["wa-webhook"])
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
