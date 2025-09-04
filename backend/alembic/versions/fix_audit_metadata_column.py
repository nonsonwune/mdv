"""

Fix audit metadata colum

Revisio

Revision ID: fix_audit_metadata_column
Revises: enhance_audit_log_schema
Create Date: 2025-09-04 19:59:07.206545

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_audit_metadata_column'
down_revision = 'enhance_audit_log_schema'
branch_labels = None
depends_on = None


def upgrade():
    """Rename metadata column to audit_metadata to avoid SQLAlchemy reserved keyword conflict."""
    
    # Check if the audit_logs table exists and has the metadata column
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'audit_logs' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('audit_logs')]
        
        if 'metadata' in columns:
            # Rename the metadata column to audit_metadata
            op.alter_column(
                'audit_logs',
                'metadata',
                new_column_name='audit_metadata',
                existing_type=sa.JSON(),
                existing_nullable=True
            )
            print("✅ Renamed 'metadata' column to 'audit_metadata' in audit_logs table")
        else:
            print("ℹ️  'metadata' column not found in audit_logs table, skipping rename")
    else:
        print("ℹ️  audit_logs table not found, skipping migration")








def downgrade():
    """Rename audit_metadata column back to metadata."""
    
    # Check if the audit_logs table exists and has the audit_metadata column
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'audit_logs' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('audit_logs')]
        
        if 'audit_metadata' in columns:
            # Rename the audit_metadata column back to metadata
            op.alter_column(
                'audit_logs',
                'audit_metadata',
                new_column_name='metadata',
                existing_type=sa.JSON(),
                existing_nullable=True
            )
            print("✅ Renamed 'audit_metadata' column back to 'metadata' in audit_logs table")
        else:
            print("ℹ️  'audit_metadata' column not found in audit_logs table, skipping rename")
    else:
        print("ℹ️  audit_logs table not found, skipping migration")
