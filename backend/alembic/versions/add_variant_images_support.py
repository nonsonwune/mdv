"""Add variant-specific images support

Revision ID: add_variant_images_support
Revises: [previous_revision]
Create Date: 2025-09-06 05:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_variant_images_support'
down_revision = None  # This should be set to the latest revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add variant_id column to product_images table for variant-specific images."""
    
    # Add variant_id column to product_images table
    op.add_column('product_images', 
        sa.Column('variant_id', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint to variants table
    op.create_foreign_key(
        'fk_product_images_variant_id_variants',
        'product_images', 'variants',
        ['variant_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Add index for performance
    op.create_index(
        'ix_product_images_variant_id',
        'product_images',
        ['variant_id']
    )
    
    # Note: Check constraint with subquery not supported in PostgreSQL
    # Data consistency will be enforced at the application level


def downgrade() -> None:
    """Remove variant-specific images support."""
    
    # Drop check constraint
    op.drop_constraint('chk_product_variant_consistency', 'product_images', type_='check')
    
    # Drop index
    op.drop_index('ix_product_images_variant_id', 'product_images')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_product_images_variant_id_variants', 'product_images', type_='foreignkey')
    
    # Drop variant_id column
    op.drop_column('product_images', 'variant_id')
