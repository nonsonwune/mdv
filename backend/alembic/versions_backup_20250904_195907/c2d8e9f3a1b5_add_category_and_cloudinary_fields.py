"""
Add category_id to products a

Revision ID: c2d8e9f3a1b5
Revises: b3bf7ca54a70
Create Date: 2025-09-04 19:57:44.618738

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d8e9f3a1b5'
down_revision = 'b3bf7ca54a70'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add category_id to products table
    op.add_column('products', sa.Column('category_id', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.add_column('products', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_products_category_id',
        'products', 'categories',
        ['category_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index on category_id
    op.create_index('ix_products_category_id', 'products', ['category_id'])
    
    # Add public_id to product_images table for Cloudinary
    op.add_column('product_images', sa.Column('public_id', sa.String(255), nullable=True))
    
    # Add index on public_id for faster lookups
    op.create_index('ix_product_images_public_id', 'product_images', ['public_id'])





def downgrade() -> None:
    # Remove indexes
    op.drop_index('ix_product_images_public_id', 'product_images')
    op.drop_index('ix_products_category_id', 'products')
    
    # Remove foreign key
    op.drop_constraint('fk_products_category_id', 'products', type_='foreignkey')
    
    # Remove columns
    op.drop_column('product_images', 'public_id')
    op.drop_column('products', 'updated_at')
    op.drop_column('products', 'created_at')
    op.drop_column('products', 'category_id')
