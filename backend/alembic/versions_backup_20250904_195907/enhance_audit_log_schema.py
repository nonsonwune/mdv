"""
e

Revision ID: enhance_audit_log_schema
Revises: create_audit_logs_simple
Create Date: 2025-09-04 19:57:44.620290

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'enhance_audit_log_schema'
down_revision = 'create_audit_logs_simple'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    bind = op.get_bind()
    audit_action_enum.create(bind, checkfirst=True)
    audit_entity_enum.create(bind, checkfirst=True)
    audit_status_enum.create(bind, checkfirst=True)
    
    # Drop existing audit_logs table if it exists
    try:
        op.drop_table('audit_logs')
    except Exception:
        pass  # Table doesn't exist, continue
    
    # Create enhanced audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        
        # Actor Information
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('actor_role', sa.String(length=50), nullable=True),
        sa.Column('actor_email', sa.String(length=255), nullable=True),
        
        # Action Details
        sa.Column('action', audit_action_enum, nullable=False),
        sa.Column('entity', audit_entity_enum, nullable=False),
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
        sa.Column('status', audit_status_enum, nullable=False, server_default='SUCCESS'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('audit_metadata', sa.JSON(), nullable=True),
        
        # Timing
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Constraints
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_audit_logs_actor_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs'))
    )
    
    # Create indexes for performance
    op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_ip_address', 'audit_logs', ['ip_address'])
    op.create_index('ix_audit_logs_session_id', 'audit_logs', ['session_id'])
    op.create_index('ix_audit_logs_request_id', 'audit_logs', ['request_id'])
    op.create_index('ix_audit_logs_status', 'audit_logs', ['status'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    
    # Composite indexes for common queries
    op.create_index('ix_audit_logs_actor_action', 'audit_logs', ['actor_id', 'action'])
    op.create_index('ix_audit_logs_entity_action', 'audit_logs', ['entity', 'action'])
    op.create_index('ix_audit_logs_created_at_desc', 'audit_logs', [sa.text('created_at DESC')])
    
    # Partial index for failed actions (PostgreSQL specific)
    op.execute("""
        CREATE INDEX ix_audit_logs_failures 
        ON audit_logs (status, created_at) 
        WHERE status = 'FAILURE'
    """)





def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_audit_logs_failures', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at_desc', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_status', table_name='audit_logs')
    op.drop_index('ix_audit_logs_request_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_session_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_ip_address', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_id', table_name='audit_logs')
    
    # Drop enhanced table
    op.drop_table('audit_logs')
    
    # Recreate basic audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('entity', sa.String(length=120), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('before', sa.JSON(), nullable=True),
        sa.Column('after', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_audit_logs_actor_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_logs'))
    )
    
    # Drop enum types
    bind = op.get_bind()
    audit_status_enum.drop(bind, checkfirst=True)
    audit_entity_enum.drop(bind, checkfirst=True)
    audit_action_enum.drop(bind, checkfirst=True)
