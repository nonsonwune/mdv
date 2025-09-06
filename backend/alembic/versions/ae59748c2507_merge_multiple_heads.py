"""Merge multiple heads

Revision ID: ae59748c2507
Revises: add_variant_images_support, bb7acd1cfcdc
Create Date: 2025-09-06 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ae59748c2507'
down_revision = ('add_variant_images_support', 'bb7acd1cfcdc')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge multiple heads - no changes needed."""
    pass


def downgrade() -> None:
    """Merge multiple heads - no changes needed."""
    pass
