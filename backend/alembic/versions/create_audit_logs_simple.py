"""Create audit logs table with simple schema

Revision ID: create_audit_logs_simple
Revises: e93d7f7e267f
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'create_audit_logs_simple'
down_revision = 'e93d7f7e267f'
branch_labels = None
depends_on = None


def upgrade():
    """Create audit logs table with SQLite-compatible schema."""
    
    # Create audit_logs table with string columns instead of enums
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        
        # Actor Information
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('actor_role', sa.String(length=50), nullable=True),
        sa.Column('actor_email', sa.String(length=255), nullable=True),
        
        # Action Details
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        
        # Data Changes
        sa.Column('before', sa.JSON(), nullable=True),
        sa.Column('after', sa.JSON(), nullable=True),
        sa.Column('changes', sa.JSON(), nullable=True),
        
        # Request Context
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=255), nullable=True),
        
        # Status and Metadata
        sa.Column('status', sa.String(length=20), nullable=False, server_default='SUCCESS'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('audit_metadata', sa.JSON(), nullable=True),
        
        # Timing
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name='fk_audit_logs_actor_id_users'),
    )
    
    # Create indexes for performance
    op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_status', 'audit_logs', ['status'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_session_id', 'audit_logs', ['session_id'])
    op.create_index('ix_audit_logs_request_id', 'audit_logs', ['request_id'])
    
    print("✅ Created audit_logs table with SQLite-compatible schema")


def downgrade():
    """Drop audit logs table and indexes."""
    
    # Drop indexes
    op.drop_index('ix_audit_logs_request_id', 'audit_logs')
    op.drop_index('ix_audit_logs_session_id', 'audit_logs')
    op.drop_index('ix_audit_logs_created_at', 'audit_logs')
    op.drop_index('ix_audit_logs_status', 'audit_logs')
    op.drop_index('ix_audit_logs_entity_id', 'audit_logs')
    op.drop_index('ix_audit_logs_entity', 'audit_logs')
    op.drop_index('ix_audit_logs_action', 'audit_logs')
    op.drop_index('ix_audit_logs_actor_id', 'audit_logs')
    
    # Drop table
    op.drop_table('audit_logs')
    
    print("✅ Dropped audit_logs table and indexes")
