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


def column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add SyncMixin columns to categories
    if not column_exists('categories', 'updated_at'):
        op.add_column('categories', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('categories', 'deleted_at'):
        op.add_column('categories', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('categories', 'version'):
        op.add_column('categories', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))

    # Add SyncMixin columns to purchases
    if not column_exists('purchases', 'updated_at'):
        op.add_column('purchases', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('purchases', 'deleted_at'):
        op.add_column('purchases', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('purchases', 'version'):
        op.add_column('purchases', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))

    # Add SyncMixin columns to tasks
    if not column_exists('tasks', 'updated_at'):
        op.add_column('tasks', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('tasks', 'deleted_at'):
        op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    if not column_exists('tasks', 'version'):
        op.add_column('tasks', sa.Column('version', sa.Integer(), nullable=True, server_default='1'))



def downgrade() -> None:
    # Remove from tasks
    if column_exists('tasks', 'version'):
        op.drop_column('tasks', 'version')
    if column_exists('tasks', 'deleted_at'):
        op.drop_column('tasks', 'deleted_at')
    if column_exists('tasks', 'updated_at'):
        op.drop_column('tasks', 'updated_at')

    # Remove from purchases
    if column_exists('purchases', 'version'):
        op.drop_column('purchases', 'version')
    if column_exists('purchases', 'deleted_at'):
        op.drop_column('purchases', 'deleted_at')
    if column_exists('purchases', 'updated_at'):
        op.drop_column('purchases', 'updated_at')

    # Remove from categories
    if column_exists('categories', 'version'):
        op.drop_column('categories', 'version')
    if column_exists('categories', 'deleted_at'):
        op.drop_column('categories', 'deleted_at')
    if column_exists('categories', 'updated_at'):
        op.drop_column('categories', 'updated_at')

