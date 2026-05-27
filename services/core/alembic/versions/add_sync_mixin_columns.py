"""add sync mixin columns (updated_at, deleted_at, version)

Revision ID: add_sync_mixin_columns
Revises: add_priority_to_tasks
Create Date: 2026-05-28 02:48:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_sync_mixin_columns'
down_revision = 'add_priority_to_tasks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add SyncMixin columns to categories
    op.add_column('categories', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('categories', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('categories', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))

    # Add SyncMixin columns to purchases
    op.add_column('purchases', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchases', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('purchases', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))

    # Add SyncMixin columns to tasks
    op.add_column('tasks', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tasks', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))



def downgrade() -> None:
    # Remove from tasks
    op.drop_column('tasks', 'version')
    op.drop_column('tasks', 'deleted_at')
    op.drop_column('tasks', 'updated_at')

    # Remove from purchases
    op.drop_column('purchases', 'version')
    op.drop_column('purchases', 'deleted_at')
    op.drop_column('purchases', 'updated_at')

    # Remove from categories
    op.drop_column('categories', 'version')
    op.drop_column('categories', 'deleted_at')
    op.drop_column('categories', 'updated_at')
