from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expires_days: int = 7
    wa_bridge_url: str = "http://wa-bridge:3001"
    wa_bridge_token: str
    telegram_bot_token: str
    upload_dir: str = "/app/uploads"
    max_file_size_mb: int = 5120

    class Config:
        env_file = ".env"


settings = Settings()
