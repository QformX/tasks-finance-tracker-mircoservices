"""add category color icon

Revision ID: add_category_color_icon
Revises: e873ed0e9e6c
Create Date: 2025-12-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_category_color_icon'
down_revision = 'e873ed0e9e6c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('color', sa.String(), nullable=True))
    op.add_column('categories', sa.Column('icon', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'icon')
    op.drop_column('categories', 'color')
