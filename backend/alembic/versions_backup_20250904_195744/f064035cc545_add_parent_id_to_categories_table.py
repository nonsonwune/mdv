"""add parent_id to categories table

Revision ID: f064035cc545
Revises: c2d8e9f3a1b5
Create Date: 2025-09-01 07:03:09.731967
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f064035cc545'
down_revision = 'a1f9e2c7'\nbranch_labels = None\ndepends_on = None\nnds_on = None

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

