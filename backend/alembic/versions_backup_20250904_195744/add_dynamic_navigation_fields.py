"""Add dynamic navigation fields to categories

Revision ID: add_dynamic_navigation_fields
Revises: bd41eba8dd9e
Create Date: 2025-01-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_dynamic_navigation_fields'
down_revision = '072fade3ff12'\nbranch_labels = None\ndepends_on = None\nnds_on = None


def upgrade() -> None:
    # Add new columns to categories table
    op.add_column('categories', sa.Column('show_in_navigation', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('categories', sa.Column('navigation_icon', sa.String(length=50), nullable=True))
    op.add_column('categories', sa.Column('is_sale_category', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('categories', sa.Column('auto_sale_threshold', sa.Integer(), nullable=True))
    op.add_column('categories', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('categories', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create indexes for performance
    op.create_index('ix_categories_show_in_navigation', 'categories', ['show_in_navigation'])
    op.create_index('ix_categories_is_sale_category', 'categories', ['is_sale_category'])
    op.create_index('ix_categories_created_at', 'categories', ['created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_categories_created_at', table_name='categories')
    op.drop_index('ix_categories_is_sale_category', table_name='categories')
    op.drop_index('ix_categories_show_in_navigation', table_name='categories')
    
    # Drop columns
    op.drop_column('categories', 'updated_at')
    op.drop_column('categories', 'created_at')
    op.drop_column('categories', 'auto_sale_threshold')
    op.drop_column('categories', 'is_sale_category')
    op.drop_column('categories', 'navigation_icon')
    op.drop_column('categories', 'show_in_navigation')
