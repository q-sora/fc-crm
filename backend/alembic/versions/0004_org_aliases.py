"""add aliases to organizations

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("aliases", JSONB, nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("organizations", "aliases")
