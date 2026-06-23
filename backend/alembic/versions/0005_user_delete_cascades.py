"""fix FK constraints so users can be deleted

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-23
"""
from alembic import op

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    # internal_chat_members: cascade delete when user is deleted
    op.drop_constraint('internal_chat_members_user_id_fkey', 'internal_chat_members', type_='foreignkey')
    op.create_foreign_key(None, 'internal_chat_members', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # internal_messages: make sender_id nullable, set NULL when user deleted
    op.alter_column('internal_messages', 'sender_id', nullable=True)
    op.drop_constraint('internal_messages_sender_id_fkey', 'internal_messages', type_='foreignkey')
    op.create_foreign_key(None, 'internal_messages', 'users', ['sender_id'], ['id'], ondelete='SET NULL')

    # external_chats: set NULL when assigned employee deleted
    op.drop_constraint('external_chats_assigned_employee_id_fkey', 'external_chats', type_='foreignkey')
    op.create_foreign_key(None, 'external_chats', 'users', ['assigned_employee_id'], ['id'], ondelete='SET NULL')

    # client_profiles: set NULL when assigned employee deleted
    op.drop_constraint('client_profiles_assigned_employee_id_fkey', 'client_profiles', type_='foreignkey')
    op.create_foreign_key(None, 'client_profiles', 'users', ['assigned_employee_id'], ['id'], ondelete='SET NULL')

    # quick_phrases: set NULL when creator deleted
    op.drop_constraint('quick_phrases_created_by_fkey', 'quick_phrases', type_='foreignkey')
    op.create_foreign_key(None, 'quick_phrases', 'users', ['created_by'], ['id'], ondelete='SET NULL')

    # files: set NULL when uploader deleted
    op.drop_constraint('files_uploaded_by_fkey', 'files', type_='foreignkey')
    op.create_foreign_key(None, 'files', 'users', ['uploaded_by'], ['id'], ondelete='SET NULL')


def downgrade():
    pass
