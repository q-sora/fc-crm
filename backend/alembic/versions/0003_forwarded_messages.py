"""add is_forwarded to messages

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "external_messages",
        sa.Column("is_forwarded", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "internal_messages",
        sa.Column("is_forwarded", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("external_messages", "is_forwarded")
    op.drop_column("internal_messages", "is_forwarded")
