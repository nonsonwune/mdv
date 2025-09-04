"""

add_customer_role_to_e

Revisio

Revision ID: e93d7f7e267f
Revises: 55fb081a9d2a
Create Date: 2025-09-04 19:59:07.205570

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e93d7f7e267f'
down_revision = '55fb081a9d2a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'customer' to the role enum
    # This uses PostgreSQL-specific syntax to add a new enum value
    op.execute("ALTER TYPE role ADD VALUE IF NOT EXISTS 'customer'")








def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum and updating all references
    # For safety, we'll leave the enum value in place but document the limitation
    pass

