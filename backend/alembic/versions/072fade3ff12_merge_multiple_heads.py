"""merge_multiple_heads

Revision ID: 072fade3ff12
Revises: add_dynamic_navigation_fields, create_audit_logs_simple
Create Date: 2025-09-04 15:31:23.430058
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '072fade3ff12'
down_revision = ('add_dynamic_navigation_fields', 'create_audit_logs_simple')
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

