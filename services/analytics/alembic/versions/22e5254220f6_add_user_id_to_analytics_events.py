"""add_user_id_to_analytics_events

Revision ID: 22e5254220f6
Revises: 11d4143119f5
Create Date: 2025-12-08 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '22e5254220f6'
down_revision: Union[str, None] = '11d4143119f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add column as nullable
    op.add_column('analytics_events', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Step 2: Fill existing records with a default UUID (or delete them if no data needed)
    # Option A: Delete all existing records (clean slate)
    op.execute("DELETE FROM analytics_events WHERE user_id IS NULL")
    
    # Option B (alternative): Fill with a dummy UUID - uncomment if you want to keep existing data
    # op.execute(f"UPDATE analytics_events SET user_id = '{uuid.uuid4()}' WHERE user_id IS NULL")
    
    # Step 3: Make column NOT NULL
    op.alter_column('analytics_events', 'user_id', nullable=False)
    
    # Step 4: Create index
    op.create_index(op.f('ix_analytics_events_user_id'), 'analytics_events', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_analytics_events_user_id'), table_name='analytics_events')
    op.drop_column('analytics_events', 'user_id')
