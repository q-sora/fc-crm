"""
Clears all data from the database except the admin account.
Useful for resetting to a clean state before re-seeding.

Run:
  docker compose exec backend python -m app.seeds.clear_db

To also delete the admin account (full wipe):
  docker compose exec backend python -m app.seeds.clear_db --all
"""
import asyncio
import sys
from sqlalchemy import text

from app.database import AsyncSessionLocal

ADMIN_EMAIL = "admin@fc-crm.local"

# Tables cleared in order that respects FK constraints
TABLES_TO_CLEAR = [
    "onboarding_sessions",
    "external_messages",
    "internal_messages",
    "external_chats",
    "internal_chat_members",
    "internal_chats",
    "client_profiles",
    "quick_phrases",
    "files",
    "user_organizations",
]


async def clear(keep_admin: bool = True):
    async with AsyncSessionLocal() as db:
        print("Clearing database...")

        for table in TABLES_TO_CLEAR:
            await db.execute(text(f"DELETE FROM {table}"))
            print(f"  [DEL] {table}")

        if keep_admin:
            await db.execute(
                text("DELETE FROM users WHERE email != :email"),
                {"email": ADMIN_EMAIL},
            )
            print(f"  [DEL] users (except {ADMIN_EMAIL})")
        else:
            await db.execute(text("DELETE FROM users"))
            print("  [DEL] users (all)")

        await db.execute(text("DELETE FROM organizations"))
        print("  [DEL] organizations")

        await db.commit()

    print("\nDone. Database cleared.")
    if keep_admin:
        print(f"Admin account preserved: {ADMIN_EMAIL}")
    else:
        print("All accounts deleted. Run seed_admin.py to recreate admin.")


if __name__ == "__main__":
    keep_admin = "--all" not in sys.argv
    if not keep_admin:
        print("WARNING: This will delete ALL users including admin.")
    asyncio.run(clear(keep_admin=keep_admin))
