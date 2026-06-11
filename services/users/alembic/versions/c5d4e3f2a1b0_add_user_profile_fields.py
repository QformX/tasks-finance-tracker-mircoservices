"""Add user profile fields

Revision ID: c5d4e3f2a1b0
Revises: b4c3d2e1f0a9
Create Date: 2026-06-11 20:43:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d4e3f2a1b0'
down_revision: Union[str, None] = 'b4c3d2e1f0a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('display_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'bio')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'display_name')
