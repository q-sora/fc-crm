"""user_organizations many-to-many

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_organizations",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "organization_id"),
    )
    op.create_index("ix_user_organizations_user_id", "user_organizations", ["user_id"])
    op.create_index("ix_user_organizations_org_id", "user_organizations", ["organization_id"])

    # Migrate existing single organization_id → junction table
    op.execute(
        "INSERT INTO user_organizations (user_id, organization_id) "
        "SELECT id, organization_id FROM users WHERE organization_id IS NOT NULL"
    )

    # Remove old FK column
    op.drop_constraint("users_organization_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "organization_id")


def downgrade() -> None:
    op.add_column("users", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "users_organization_id_fkey", "users", "organizations", ["organization_id"], ["id"]
    )
    op.execute(
        "UPDATE users SET organization_id = uo.organization_id "
        "FROM (SELECT DISTINCT ON (user_id) user_id, organization_id "
        "      FROM user_organizations ORDER BY user_id, organization_id) uo "
        "WHERE users.id = uo.user_id"
    )
    op.drop_index("ix_user_organizations_org_id", "user_organizations")
    op.drop_index("ix_user_organizations_user_id", "user_organizations")
    op.drop_table("user_organizations")
