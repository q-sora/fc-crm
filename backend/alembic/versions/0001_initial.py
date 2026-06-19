"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "employee", name="userrole"), nullable=False, server_default="employee"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("original_name", sa.String(512), nullable=False),
        sa.Column("stored_path", sa.String(1024), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "client_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(512), nullable=True),
        sa.Column("iin", sa.String(12), nullable=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("whatsapp_phone", sa.String(32), nullable=True, unique=True),
        sa.Column("telegram_user_id", sa.BigInteger(), nullable=True, unique=True),
        sa.Column("telegram_username", sa.String(255), nullable=True),
        sa.Column("channel", sa.Enum("whatsapp", "telegram", name="channel"), nullable=False),
        sa.Column(
            "onboarding_step",
            sa.Enum("ask_name", "ask_iin", "ask_org", "done", name="onboardingstep"),
            nullable=False,
            server_default="ask_name",
        ),
        sa.Column("onboarding_data", JSONB(), nullable=False, server_default="{}"),
        sa.Column("assigned_employee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_client_profiles_iin", "client_profiles", ["iin"])
    op.create_index("ix_client_profiles_whatsapp_phone", "client_profiles", ["whatsapp_phone"])
    op.create_index("ix_client_profiles_telegram_user_id", "client_profiles", ["telegram_user_id"])

    op.create_table(
        "external_chats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_profile_id", sa.Integer(), sa.ForeignKey("client_profiles.id"), nullable=False),
        sa.Column("assigned_employee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("channel", sa.Enum("whatsapp", "telegram", name="channel"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("active", "archived", name="chatstatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "external_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("external_chats.id"), nullable=False),
        sa.Column("direction", sa.Enum("in", "out", name="messagedirection"), nullable=False),
        sa.Column(
            "message_type",
            sa.Enum("text", "image", "document", "audio", "video", name="messagetype"),
            nullable=False,
            server_default="text",
        ),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("file_id", sa.Integer(), sa.ForeignKey("files.id"), nullable=True),
        sa.Column("wa_message_id", sa.String(255), nullable=True),
        sa.Column("tg_message_id", sa.BigInteger(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_external_messages_chat_id", "external_messages", ["chat_id"])
    op.create_index("ix_external_messages_wa_message_id", "external_messages", ["wa_message_id"])
    op.create_index("ix_external_messages_tg_message_id", "external_messages", ["tg_message_id"])

    op.create_table(
        "internal_chats",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.Enum("direct", "group", name="internalchattype"), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "internal_chat_members",
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("internal_chats.id"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "internal_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("chat_id", sa.Integer(), sa.ForeignKey("internal_chats.id"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column(
            "message_type",
            sa.Enum("text", "image", "document", name="internalmessagetype"),
            nullable=False,
            server_default="text",
        ),
        sa.Column("file_id", sa.Integer(), sa.ForeignKey("files.id"), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_internal_messages_chat_id", "internal_messages", ["chat_id"])

    op.create_table(
        "quick_phrases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "onboarding_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("channel", sa.Enum("whatsapp", "telegram", name="channel"), nullable=False),
        sa.Column("external_id", sa.String(64), nullable=False),
        sa.Column(
            "step",
            sa.Enum("ask_name", "ask_iin", "ask_org", "done", name="onboardingstep"),
            nullable=False,
            server_default="ask_name",
        ),
        sa.Column("collected_data", JSONB(), nullable=False, server_default="{}"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_onboarding_sessions_external_id", "onboarding_sessions", ["external_id"])


def downgrade() -> None:
    op.drop_table("onboarding_sessions")
    op.drop_table("quick_phrases")
    op.drop_table("internal_messages")
    op.drop_table("internal_chat_members")
    op.drop_table("internal_chats")
    op.drop_table("external_messages")
    op.drop_table("external_chats")
    op.drop_table("client_profiles")
    op.drop_table("files")
    op.drop_table("users")
    op.drop_table("organizations")

    # Drop custom enum types
    for enum_name in ["userrole", "channel", "onboardingstep", "chatstatus",
                       "messagedirection", "messagetype", "internalchattype", "internalmessagetype"]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
