"""
add missi

Revision ID: 3c25fab13c32
Revises: c2d8e9f3a1b5
Create Date: 2025-09-04 19:57:44.618883

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3c25fab13c32'
down_revision = 'c2d8e9f3a1b5'
branch_labels = None
depends_on = None


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

