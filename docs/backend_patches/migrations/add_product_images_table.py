"""Alembic migration for product_images table.
Adjust revision IDs and imports to your project.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_product_images_table'
down_revision = 'a1f9e2c7_add_refund_method_and_app_settings'  # adjust
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'product_images',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('product_id', sa.BigInteger(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('alt_text', sa.Text()),
        sa.Column('width', sa.Integer()),
        sa.Column('height', sa.Integer()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_product_images_product_sort', 'product_images', ['product_id', 'sort_order'])
    op.create_index('ux_product_images_one_primary', 'product_images', ['product_id'], unique=True, postgresql_where=sa.text('is_primary'))


def downgrade():
    op.drop_index('ux_product_images_one_primary', table_name='product_images')
    op.drop_index('ix_product_images_product_sort', table_name='product_images')
    op.drop_table('product_images')

