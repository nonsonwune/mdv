"""add_missing_tables_including_refunds

Revision ID: bb7acd1cfcdc
Revises: 1652add7b7e5
Create Date: 2025-09-04 22:15:43.805045
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bb7acd1cfcdc'
down_revision = '1652add7b7e5'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create missing tables that should have been in the init schema
    from sqlalchemy import text
    bind = op.get_bind()

    def table_exists(table_name):
        try:
            result = bind.execute(text(f"""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name = '{table_name}'
            """))
            return result.fetchone() is not None
        except Exception:
            return False

    # Products table
    if not table_exists('products'):
        op.create_table('products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=240), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('compare_at_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name=op.f('fk_products_category_id_categories')),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_products'))
        )
        op.create_index(op.f('ix_products_slug'), 'products', ['slug'], unique=True)
        print("✅ Created products table")
    else:
        print("✅ Products table already exists, skipping")

    # Variants table
    if not table_exists('variants'):
        op.create_table('variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('compare_at_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('inventory_quantity', sa.Integer(), nullable=False),
        sa.Column('sku', sa.String(length=120), nullable=False),
        sa.Column('weight', sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column('requires_shipping', sa.Boolean(), nullable=False),
        sa.Column('taxable', sa.Boolean(), nullable=False),
        sa.Column('barcode', sa.String(length=120), nullable=True),
        sa.Column('fulfillment_service', sa.String(length=80), nullable=False),
        sa.Column('inventory_management', sa.String(length=80), nullable=False),
        sa.Column('inventory_policy', sa.String(length=80), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_variants_product_id_products'), ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_variants'))
        )
        op.create_index(op.f('ix_variants_product_id'), 'variants', ['product_id'], unique=False)
        op.create_index(op.f('ix_variants_sku'), 'variants', ['sku'], unique=True)
        print("✅ Created variants table")
    else:
        print("✅ Variants table already exists, skipping")

    # Product Images table
    if not table_exists('product_images'):
        op.create_table('product_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('alt_text', sa.String(length=200), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_product_images_product_id_products'), ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_product_images'))
        )
        op.create_index(op.f('ix_product_images_product_id'), 'product_images', ['product_id'], unique=False)
        print("✅ Created product_images table")
    else:
        print("✅ Product images table already exists, skipping")

    # Orders table
    if not table_exists('orders'):
        op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PendingPayment', 'Paid', 'Cancelled', 'Refunded', name='order_status'), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('shipping_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_orders_user_id_users')),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_orders'))
        )
        op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)
        op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
        print("✅ Created orders table")
    else:
        print("✅ Orders table already exists, skipping")

    # Order Items table
    if not table_exists('order_items'):
        op.create_table('order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], name=op.f('fk_order_items_order_id_orders'), ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['variant_id'], ['variants.id'], name=op.f('fk_order_items_variant_id_variants')),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_order_items'))
        )
        op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
        print("✅ Created order_items table")
    else:
        print("✅ Order items table already exists, skipping")

    # CRITICAL: Refunds table (this was missing and causing the migration failure)
    if not table_exists('refunds'):
        op.create_table('refunds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('reason', sa.String(length=160), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('paystack_ref', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_refunds_created_by_users')),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], name=op.f('fk_refunds_order_id_orders'), ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_refunds'))
        )
        op.create_index(op.f('ix_refunds_order_id'), 'refunds', ['order_id'], unique=False)
        print("✅ Created refunds table - CRITICAL FIX")
    else:
        print("✅ Refunds table already exists, skipping")


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key dependencies)
    op.drop_index(op.f('ix_refunds_order_id'), table_name='refunds')
    op.drop_table('refunds')
    op.drop_index(op.f('ix_order_items_order_id'), table_name='order_items')
    op.drop_table('order_items')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_table('orders')
    op.drop_index(op.f('ix_product_images_product_id'), table_name='product_images')
    op.drop_table('product_images')
    op.drop_index(op.f('ix_variants_sku'), table_name='variants')
    op.drop_index(op.f('ix_variants_product_id'), table_name='variants')
    op.drop_table('variants')
    op.drop_index(op.f('ix_products_slug'), table_name='products')
    op.drop_table('products')

