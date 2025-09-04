"""merge audit fixes

Revision ID: bd41eba8dd9e
Revises: e93d7f7e267f, fix_audit_metadata_column
Create Date: 2025-09-04 13:44:42.677218
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bd41eba8dd9e'
down_revision = ('e93d7f7e267f', 'fix_audit_metadata_column')
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

