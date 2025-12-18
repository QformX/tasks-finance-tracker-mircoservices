"""add priority to tasks

Revision ID: add_priority_to_tasks
Revises: 901f8fb8f92a
Create Date: 2025-12-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_priority_to_tasks'
down_revision = '901f8fb8f92a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('priority', sa.String(), server_default='medium', nullable=False))


def downgrade() -> None:
    op.drop_column('tasks', 'priority')
