"""

add refu

Revisio

Revision ID: a1f9e2c7
Revises: e93d7f7e267f
Create Date: 2025-09-04 19:59:07.205685

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1f9e2c7'
down_revision = 'e93d7f7e267f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create Enum type for refund_method
    refund_method = sa.Enum('paystack', 'manual', name='refund_method')
    refund_method.create(op.get_bind(), checkfirst=True)

    # Add columns to refunds
    op.add_column('refunds', sa.Column('refund_method', refund_method, nullable=False, server_default='paystack'))
    op.add_column('refunds', sa.Column('manual_ref', sa.String(length=160), nullable=True))
    # Drop server default after creation
    op.alter_column('refunds', 'refund_method', server_default=None)

    # App settings table
    op.create_table(
        'app_settings',
        sa.Column('key', sa.String(length=80), primary_key=True),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )








def downgrade() -> None:
    op.drop_table('app_settings')
    op.drop_column('refunds', 'manual_ref')
    op.drop_column('refunds', 'refund_method')
    refund_method = sa.Enum('paystack', 'manual', name='refund_method')
    refund_method.drop(op.get_bind(), checkfirst=True)
