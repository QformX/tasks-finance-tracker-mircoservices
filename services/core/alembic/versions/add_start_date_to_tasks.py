"""add start_date to tasks

Revision ID: add_start_date_to_tasks
Revises: add_sync_mixin_columns
Create Date: 2026-06-11 13:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_start_date_to_tasks'
down_revision = 'add_sync_mixin_columns'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not column_exists('tasks', 'start_date'):
        op.add_column('tasks', sa.Column('start_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    if column_exists('tasks', 'start_date'):
        op.drop_column('tasks', 'start_date')
