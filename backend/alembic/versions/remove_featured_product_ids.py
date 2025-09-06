"""remove featured_product_ids from homepage_config

Revision ID: remove_featured_product_ids
Revises: add_homepage_config_table
Create Date: 2025-01-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'remove_featured_product_ids'
down_revision = 'add_homepage_config_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the featured_product_ids column from homepage_config table
    op.drop_column('homepage_config', 'featured_product_ids')


def downgrade() -> None:
    # Add back the featured_product_ids column
    op.add_column('homepage_config', sa.Column('featured_product_ids', postgresql.JSON(astext_type=sa.Text()), nullable=True))
