"""add missing columns to categories table

Revision ID: 3c25fab13c32
Revises: f064035cc545
Create Date: 2025-09-01 07:10:11.847765
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3c25fab13c32'
down_revision = 'add_dynamic_navigation_fields'\nbranch_labels = None\ndepends_on = None\nnds_on = None

def upgrade() -> None:
    # Add missing columns to categories table
    op.add_column('categories', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('categories', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('categories', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove added columns from categories table
    op.drop_column('categories', 'is_active')
    op.drop_column('categories', 'sort_order')
    op.drop_column('categories', 'description')

