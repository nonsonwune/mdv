"""
Comprehensive Test Suite for MDV Audit Logging System

Tests all aspects of the audit system including:
- Core audit functionality
- Security and privacy controls
- Performance and reliability
- Integration with existing systems
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from mdv.audit import AuditService, AuditContext, audit_context
from mdv.audit_decorators import audit_endpoint, audit_data_change
from mdv.audit_security import AuditSecurityManager, DataClassification
from mdv.models import (
    AuditLog, AuditAction, AuditEntity, AuditStatus,
    User, Role, Order, OrderStatus
)


class TestAuditService:
    """Test the core audit service functionality."""
    
    @pytest.mark.asyncio
    async def test_log_event_basic(self, db_session: AsyncSession):
        """Test basic audit event logging."""
        # Create test user
        user = User(
            name="Test User",
            email="test@mdv.ng",
            role=Role.admin,
            active=True
        )
        db_session.add(user)
        await db_session.flush()
        
        # Set audit context
        audit_context.actor_id = user.id
        audit_context.actor_role = user.role.value
        audit_context.actor_email = user.email
        audit_context.ip_address = "192.168.1.1"
        audit_context.session_id = "test_session_123"
        
        # Log an event
        log_id = await AuditService.log_event(
            action=AuditAction.CREATE,
            entity=AuditEntity.ORDER,
            entity_id=123,
            after={"status": "pending", "total": 100.00},
            metadata={"test": True},
            session=db_session
        )
        
        assert log_id is not None
        
        # Verify the log was created
        result = await db_session.get(AuditLog, log_id)
        assert result is not None
        assert result.action == AuditAction.CREATE
        assert result.entity == AuditEntity.ORDER
        assert result.entity_id == 123
        assert result.actor_id == user.id
        assert result.ip_address == "192.168.1.1"
        assert result.status == AuditStatus.SUCCESS
    
    @pytest.mark.asyncio
    async def test_log_authentication_success(self, db_session: AsyncSession):
        """Test successful authentication logging."""
        user = User(
            name="Test User",
            email="test@mdv.ng",
            role=Role.customer,
            active=True
        )
        db_session.add(user)
        await db_session.flush()
        
        log_id = await AuditService.log_authentication(
            action=AuditAction.LOGIN,
            user_id=user.id,
            email=user.email,
            success=True,
            metadata={"login_method": "password"}
        )
        
        assert log_id is not None
        
        # Verify the log
        result = await db_session.get(AuditLog, log_id)
        assert result.action == AuditAction.LOGIN
        assert result.status == AuditStatus.SUCCESS
        assert result.metadata["login_method"] == "password"
    
    @pytest.mark.asyncio
    async def test_log_authentication_failure(self, db_session: AsyncSession):
        """Test failed authentication logging."""
        log_id = await AuditService.log_authentication(
            action=AuditAction.LOGIN_FAILED,
            email="nonexistent@mdv.ng",
            success=False,
            error_message="User not found",
            metadata={"attempt_count": 3}
        )
        
        assert log_id is not None
        
        # Verify the log
        result = await db_session.get(AuditLog, log_id)
        assert result.action == AuditAction.LOGIN_FAILED
        assert result.status == AuditStatus.FAILURE
        assert result.error_message == "User not found"
    
    @pytest.mark.asyncio
    async def test_log_data_change(self, db_session: AsyncSession):
        """Test data change logging with before/after states."""
        before_state = {"status": "pending", "total": 100.00}
        after_state = {"status": "paid", "total": 100.00}
        
        log_id = await AuditService.log_data_change(
            action=AuditAction.UPDATE,
            entity=AuditEntity.ORDER,
            entity_id=456,
            before=before_state,
            after=after_state,
            session=db_session
        )
        
        assert log_id is not None
        
        # Verify the log
        result = await db_session.get(AuditLog, log_id)
        assert result.before == before_state
        assert result.after == after_state
        assert result.changes is not None
        assert "status" in result.changes
        assert result.changes["status"]["from"] == "pending"
        assert result.changes["status"]["to"] == "paid"
    
    @pytest.mark.asyncio
    async def test_audit_failure_handling(self, db_session: AsyncSession):
        """Test that audit failures don't break application flow."""
        # Mock database error
        with patch.object(db_session, 'execute', side_effect=Exception("DB Error")):
            log_id = await AuditService.log_event(
                action=AuditAction.CREATE,
                entity=AuditEntity.ORDER,
                entity_id=789,
                session=db_session
            )
            
            # Should return None but not raise exception
            assert log_id is None


class TestAuditDecorators:
    """Test audit decorators for automatic logging."""
    
    @pytest.mark.asyncio
    async def test_audit_endpoint_decorator(self, db_session: AsyncSession):
        """Test the audit_endpoint decorator."""
        
        @audit_endpoint(
            action=AuditAction.UPDATE,
            entity=AuditEntity.ORDER,
            entity_id_param="order_id"
        )
        async def update_order(order_id: int, status: str):
            return {"id": order_id, "status": status}
        
        # Mock the audit service
        with patch.object(AuditService, 'log_event') as mock_log:
            result = await update_order(order_id=123, status="shipped")
            
            assert result["id"] == 123
            assert result["status"] == "shipped"
            
            # Verify audit was called
            mock_log.assert_called_once()
            call_args = mock_log.call_args[1]
            assert call_args["action"] == AuditAction.UPDATE
            assert call_args["entity"] == AuditEntity.ORDER
            assert call_args["entity_id"] == 123
    
    @pytest.mark.asyncio
    async def test_audit_decorator_error_handling(self, db_session: AsyncSession):
        """Test audit decorator handles errors properly."""
        
        @audit_endpoint(
            action=AuditAction.DELETE,
            entity=AuditEntity.ORDER,
            entity_id_param="order_id"
        )
        async def delete_order(order_id: int):
            raise ValueError("Order not found")
        
        with patch.object(AuditService, 'log_event') as mock_log:
            with pytest.raises(ValueError):
                await delete_order(order_id=999)
            
            # Verify failure was logged
            mock_log.assert_called_once()
            call_args = mock_log.call_args[1]
            assert call_args["status"] == AuditStatus.FAILURE
            assert "Order not found" in call_args["error_message"]


class TestAuditSecurity:
    """Test security and privacy controls."""
    
    def test_data_sanitization(self):
        """Test sensitive data sanitization."""
        security_manager = AuditSecurityManager()
        
        sensitive_data = {
            "email": "user@example.com",
            "password": "secret123",
            "credit_card": "4111111111111111",
            "normal_field": "normal_value"
        }
        
        sanitized = security_manager.sanitize_audit_data(
            sensitive_data, 
            DataClassification.CONFIDENTIAL
        )
        
        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["credit_card"] == "[REDACTED]"
        assert "us***@ex***" in sanitized["email"]  # Masked
        assert sanitized["normal_field"] == "normal_value"
    
    def test_retention_policies(self):
        """Test audit log retention policies."""
        security_manager = AuditSecurityManager()
        
        # Test different retention periods
        login_period = security_manager.get_retention_period("LOGIN")
        assert login_period == timedelta(days=365)  # Medium term
        
        failed_login_period = security_manager.get_retention_period("LOGIN_FAILED")
        assert failed_login_period == timedelta(days=2555)  # Long term
        
        payment_period = security_manager.get_retention_period("PAYMENT_STATUS_CHANGE")
        assert payment_period == timedelta(days=2555)  # Long term
    
    def test_access_permissions(self):
        """Test access permission filtering."""
        security_manager = AuditSecurityManager()
        
        # Create test users
        admin_user = User(id=1, role=Role.admin, email="admin@mdv.ng")
        ops_user = User(id=2, role=Role.operations, email="ops@mdv.ng")
        
        # Create test logs
        admin_log = AuditLog(
            id=1, actor_id=1, actor_role="admin",
            action=AuditAction.CREATE, entity=AuditEntity.USER
        )
        order_log = AuditLog(
            id=2, actor_id=2, actor_role="operations",
            action=AuditAction.UPDATE, entity=AuditEntity.ORDER
        )
        
        logs = [admin_log, order_log]
        
        # Admin should see all logs
        admin_filtered = security_manager.check_access_permissions(admin_user, logs)
        assert len(admin_filtered) == 2
        
        # Operations user should only see order-related logs
        ops_filtered = security_manager.check_access_permissions(ops_user, logs)
        assert len(ops_filtered) == 1
        assert ops_filtered[0].entity == AuditEntity.ORDER
    
    def test_audit_integrity(self):
        """Test audit log integrity verification."""
        security_manager = AuditSecurityManager()
        
        log_data = {
            "id": 123,
            "action": "CREATE",
            "entity": "ORDER",
            "entity_id": 456,
            "actor_id": 789,
            "created_at": datetime.utcnow()
        }
        
        # Generate hash
        hash_value = security_manager.generate_audit_hash(log_data)
        assert hash_value is not None
        assert len(hash_value) == 64  # SHA256 hex length
        
        # Verify integrity
        is_valid = security_manager.verify_audit_integrity(log_data, hash_value)
        assert is_valid is True
        
        # Test with tampered data
        tampered_data = log_data.copy()
        tampered_data["entity_id"] = 999
        is_valid_tampered = security_manager.verify_audit_integrity(tampered_data, hash_value)
        assert is_valid_tampered is False


class TestAuditContext:
    """Test audit context management."""
    
    def test_audit_context_setup(self):
        """Test audit context initialization."""
        context = AuditContext()
        
        # Mock request object
        mock_request = Mock()
        mock_request.headers = {
            "user-agent": "Mozilla/5.0",
            "x-forwarded-for": "192.168.1.1, 10.0.0.1"
        }
        mock_request.cookies = {"session_id": "test_session"}
        mock_request.client.host = "192.168.1.100"
        
        # Mock user
        mock_user = Mock()
        mock_user.id = 123
        mock_user.role.value = "admin"
        mock_user.email = "admin@mdv.ng"
        
        context.set_request_context(mock_request, mock_user)
        
        assert context.ip_address == "192.168.1.1"  # First IP from forwarded header
        assert context.user_agent == "Mozilla/5.0"
        assert context.session_id == "test_session"
        assert context.actor_id == 123
        assert context.actor_role == "admin"
        assert context.actor_email == "admin@mdv.ng"


class TestAuditPerformance:
    """Test audit system performance characteristics."""
    
    @pytest.mark.asyncio
    async def test_batch_logging_performance(self, db_session: AsyncSession):
        """Test performance of batch audit logging."""
        import time
        
        start_time = time.time()
        
        # Log multiple events
        tasks = []
        for i in range(100):
            task = AuditService.log_event(
                action=AuditAction.CREATE,
                entity=AuditEntity.PRODUCT,
                entity_id=i,
                metadata={"batch_test": True},
                session=db_session
            )
            tasks.append(task)
        
        # Execute all tasks
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert duration < 5.0  # 5 seconds for 100 logs
        
        # Verify no exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0
    
    @pytest.mark.asyncio
    async def test_audit_overhead(self, db_session: AsyncSession):
        """Test that audit logging doesn't significantly impact performance."""
        
        async def business_operation():
            """Simulate a business operation."""
            await asyncio.sleep(0.01)  # 10ms operation
            return "success"
        
        # Measure without audit
        start_time = time.time()
        result1 = await business_operation()
        no_audit_time = time.time() - start_time
        
        # Measure with audit
        start_time = time.time()
        result2 = await business_operation()
        await AuditService.log_event(
            action=AuditAction.UPDATE,
            entity=AuditEntity.ORDER,
            entity_id=1,
            session=db_session
        )
        with_audit_time = time.time() - start_time
        
        # Audit overhead should be minimal (less than 100% increase)
        overhead = (with_audit_time - no_audit_time) / no_audit_time
        assert overhead < 1.0  # Less than 100% overhead
        
        assert result1 == result2 == "success"


@pytest.fixture
async def db_session():
    """Provide a test database session."""
    # This would be implemented based on your test database setup
    # For now, return a mock session
    session = Mock(spec=AsyncSession)
    session.add = Mock()
    session.flush = Mock()
    session.commit = Mock()
    session.get = Mock()
    session.execute = Mock()
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
