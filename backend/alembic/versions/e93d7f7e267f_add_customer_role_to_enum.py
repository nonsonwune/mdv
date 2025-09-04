"""add_customer_role_to_enum

Revision ID: e93d7f7e267f
Revises: 3c25fab13c32
Create Date: 2025-09-04 12:08:27.957291

This migration adds the 'customer' role to the existing role enum.
This is part of the security fix to properly separate customer and staff users.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e93d7f7e267f'
down_revision = '3c25fab13c32'
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

