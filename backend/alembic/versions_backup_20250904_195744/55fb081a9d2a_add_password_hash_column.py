"""add_password_hash_column and customer tables

Revision ID: 55fb081a9d2a
Revises: b3bf7ca54a70
Create Date:
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '55fb081a9d2a'
down_revision = 'fix_audit_metadata_column'\nbranch_labels = None\ndepends_on = None\nnds_on = None

def upgrade() -> None:
    # Add password_hash column to users table
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))
    
    # Create user_addresses table
    op.create_table(
        'user_addresses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(80), nullable=True),
        sa.Column('name', sa.String(160), nullable=False),
        sa.Column('phone', sa.String(32), nullable=False),
        sa.Column('state', sa.String(80), nullable=False),
        sa.Column('city', sa.String(120), nullable=False),
        sa.Column('street', sa.String(255), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_addresses_user_id'), 'user_addresses', ['user_id'])
    
    # Create wishlists table
    op.create_table(
        'wishlists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_wishlists_user_id'), 'wishlists', ['user_id'])
    
    # Create wishlist_items table
    op.create_table(
        'wishlist_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('wishlist_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['wishlist_id'], ['wishlists.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['variant_id'], ['variants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wishlist_id', 'product_id', 'variant_id', name='uq_wishlist_product_variant')
    )
    op.create_index(op.f('ix_wishlist_items_wishlist_id'), 'wishlist_items', ['wishlist_id'])
    op.create_index(op.f('ix_wishlist_items_product_id'), 'wishlist_items', ['product_id'])
    
    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('would_recommend', sa.Boolean(), nullable=False, default=True),
        sa.Column('verified_purchase', sa.Boolean(), nullable=False, default=False),
        sa.Column('helpful_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['variant_id'], ['variants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'user_id', name='uq_review_product_user')
    )
    op.create_index(op.f('ix_reviews_product_id'), 'reviews', ['product_id'])
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'])
    
    # Create review_votes table
    op.create_table(
        'review_votes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'user_id', name='uq_review_vote_user')
    )
    op.create_index(op.f('ix_review_votes_review_id'), 'review_votes', ['review_id'])


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_review_votes_review_id'), table_name='review_votes')
    op.drop_table('review_votes')
    
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_product_id'), table_name='reviews')
    op.drop_table('reviews')
    
    op.drop_index(op.f('ix_wishlist_items_product_id'), table_name='wishlist_items')
    op.drop_index(op.f('ix_wishlist_items_wishlist_id'), table_name='wishlist_items')
    op.drop_table('wishlist_items')
    
    op.drop_index(op.f('ix_wishlists_user_id'), table_name='wishlists')
    op.drop_table('wishlists')
    
    op.drop_index(op.f('ix_user_addresses_user_id'), table_name='user_addresses')
    op.drop_table('user_addresses')
    
    # Drop password_hash column
    op.drop_column('users', 'password_hash')

