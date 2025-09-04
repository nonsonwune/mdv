"""
add pare

Revision ID: f064035cc545
Revises: 3c25fab13c32
Create Date: 2025-09-04 19:57:44.619031

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f064035cc545'
down_revision = '3c25fab13c32'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add parent_id column to categories table
    op.add_column('categories', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_categories_parent_id'), 'categories', ['parent_id'], unique=False)
    op.create_foreign_key(None, 'categories', 'categories', ['parent_id'], ['id'])





def downgrade() -> None:
    # Remove parent_id column from categories table
    op.drop_constraint(None, 'categories', type_='foreignkey')
    op.drop_index(op.f('ix_categories_parent_id'), table_name='categories')
    op.drop_column('categories', 'parent_id')

