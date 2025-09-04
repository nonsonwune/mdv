"""add refund method and app settings

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
    from sqlalchemy import text

    bind = op.get_bind()

    # Check if we're in offline mode (SQL generation)
    if bind.dialect.name == 'postgresql' and hasattr(bind, 'execute'):
        try:
            # First check if refunds table exists
            table_result = bind.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name = 'refunds'
            """))

            if table_result is None:
                # In SQL generation mode, assume table doesn't exist
                refunds_table_exists = False
                refund_method_exists = False
            else:
                refunds_table_exists = table_result.fetchone() is not None

                if not refunds_table_exists:
                    print("refunds table doesn't exist, skipping refund_method column addition...")
                    refund_method_exists = False
                else:
                    # Check if refund_method column already exists
                    result = bind.execute(text("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'refunds' AND column_name = 'refund_method'
                    """))
                    refund_method_exists = result.fetchone() is not None if result else False
        except Exception as e:
            # In case of any error (like SQL generation mode), assume table doesn't exist
            print(f"Could not check table existence (likely SQL generation mode): {e}")
            refunds_table_exists = False
            refund_method_exists = False
    else:
        # Not PostgreSQL or in offline mode
        refunds_table_exists = False
        refund_method_exists = False

    if refunds_table_exists and not refund_method_exists:
        # Create Enum type for refund_method
        refund_method = sa.Enum('paystack', 'manual', name='refund_method')
        refund_method.create(bind, checkfirst=True)

        # Add columns to refunds
        op.add_column('refunds', sa.Column('refund_method', refund_method, nullable=False, server_default='paystack'))
        op.add_column('refunds', sa.Column('manual_ref', sa.String(length=160), nullable=True))
        # Drop server default after creation
        op.alter_column('refunds', 'refund_method', server_default=None)
    elif refund_method_exists:
        print("refund_method column already exists, skipping...")
    else:
        print("refunds table doesn't exist, skipping refund_method column addition...")

    # Check if app_settings table already exists
    try:
        result = bind.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'app_settings'
        """))
        app_settings_exists = result.fetchone() is not None if result else False
    except Exception as e:
        print(f"Could not check app_settings table existence (likely SQL generation mode): {e}")
        app_settings_exists = False

    if not app_settings_exists:
        # App settings table
        op.create_table(
            'app_settings',
            sa.Column('key', sa.String(length=80), primary_key=True),
            sa.Column('value', sa.JSON(), nullable=False),
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
    else:
        print("app_settings table already exists, skipping...")








def downgrade() -> None:
    from sqlalchemy import text

    bind = op.get_bind()

    # Check if app_settings table exists before dropping
    result = bind.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'app_settings'
    """))

    if result.fetchone() is not None:
        op.drop_table('app_settings')

    # Check if refund_method columns exist before dropping
    result = bind.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'refunds' AND column_name IN ('manual_ref', 'refund_method')
    """))

    existing_columns = [row[0] for row in result.fetchall()]

    if 'manual_ref' in existing_columns:
        op.drop_column('refunds', 'manual_ref')

    if 'refund_method' in existing_columns:
        op.drop_column('refunds', 'refund_method')
        # Drop enum type
        refund_method = sa.Enum('paystack', 'manual', name='refund_method')
        refund_method.drop(bind, checkfirst=True)
