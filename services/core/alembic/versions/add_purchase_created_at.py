"""add purchase created_at

Revision ID: add_purchase_created_at
Revises: add_category_color_icon
Create Date: 2025-12-13 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_purchase_created_at'
down_revision = 'add_category_color_icon'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('purchases', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    op.drop_column('purchases', 'created_at')
