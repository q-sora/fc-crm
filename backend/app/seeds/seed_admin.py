"""
Run:
  docker compose exec backend python -m app.seeds.seed_admin
"""
import asyncio
from passlib.context import CryptContext
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = "admin@fc-crm.local"
ADMIN_PASSWORD = "Admin1234!"
ADMIN_NAME = "Администратор"


async def seed():
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if existing:
            print(f"Admin already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            password_hash=pwd_context.hash(ADMIN_PASSWORD),
            name=ADMIN_NAME,
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("Change the password after first login!")


if __name__ == "__main__":
    asyncio.run(seed())
