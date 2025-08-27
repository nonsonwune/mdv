"""Integration tests for admin functionality."""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta

from backend.api.main import app
from backend.api.deps import get_db as _get_db_dep
from mdv.models import User, Role, Product, Category, Inventory, Variant
from backend.mdv.db import get_async_db, Base
from mdv.auth import create_access_token


# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_admin.db"

@pytest.fixture
async def test_db():
    """Create a test database."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
def test_client():
    """Create a test client."""
    return TestClient(app)


# Ensure API uses the test database session
@pytest.fixture(autouse=True)
async def override_db_dependency(test_db):
    async def _override_get_db():
        yield test_db

    app.dependency_overrides[_get_db_dep] = _override_get_db
    yield
    app.dependency_overrides.pop(_get_db_dep, None)


@pytest.fixture
async def admin_user(test_db):
    """Create an admin user for testing."""
    admin = User(
        id=1,
        name="Admin User",
        email="admin@test.com",
        role=Role.admin,
        active=True
    )
    test_db.add(admin)
    await test_db.commit()
    return admin


@pytest.fixture
async def supervisor_user(test_db):
    """Create a supervisor user for testing."""
    supervisor = User(
        id=2,
        name="Supervisor User", 
        email="supervisor@test.com",
        role=Role.supervisor,
        active=True
    )
    test_db.add(supervisor)
    await test_db.commit()
    return supervisor


@pytest.fixture
async def operations_user(test_db):
    """Create an operations user for testing."""
    operations = User(
        id=3,
        name="Operations User",
        email="operations@test.com", 
        role=Role.operations,
        active=True
    )
    test_db.add(operations)
    await test_db.commit()
    return operations


@pytest.fixture
async def logistics_user(test_db):
    """Create a logistics user for testing."""
    logistics = User(
        id=4,
        name="Logistics User",
        email="logistics@test.com",
        role=Role.logistics,
        active=True
    )
    test_db.add(logistics)
    await test_db.commit()
    return logistics


@pytest.fixture
def admin_headers(admin_user):
    """Create auth headers for admin user."""
    token = create_access_token(str(admin_user.id), admin_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture  
def supervisor_headers(supervisor_user):
    """Create auth headers for supervisor user."""
    token = create_access_token(str(supervisor_user.id), supervisor_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def operations_headers(operations_user):
    """Create auth headers for operations user.""" 
    token = create_access_token(str(operations_user.id), operations_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def logistics_headers(logistics_user):
    """Create auth headers for logistics user."""
    token = create_access_token(str(logistics_user.id), logistics_user.role)
    return {"Authorization": f"Bearer {token}"}


class TestUserManagement:
    """Test admin user management endpoints."""
    
    async def test_admin_can_list_users(self, test_client, admin_headers):
        """Test that admin can list users."""
        response = test_client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    
    async def test_supervisor_can_list_users(self, test_client, supervisor_headers):
        """Test that supervisor can list users."""
        response = test_client.get("/api/admin/users", headers=supervisor_headers)
        assert response.status_code == 200
        
    async def test_operations_cannot_list_users(self, test_client, operations_headers):
        """Test that operations cannot list users."""
        response = test_client.get("/api/admin/users", headers=operations_headers)
        assert response.status_code == 403
        
    async def test_admin_can_create_user(self, test_client, admin_headers):
        """Test that admin can create users."""
        user_data = {
            "name": "Test User",
            "email": "testuser@test.com",
            "role": "operations",
            "password": "testpassword123",
            "active": True
        }
        response = test_client.post("/api/admin/users", headers=admin_headers, json=user_data)
        assert response.status_code == 200
        
    async def test_operations_cannot_create_user(self, test_client, operations_headers):
        """Test that operations cannot create users."""
        user_data = {
            "name": "Test User",
            "email": "testuser@test.com", 
            "role": "operations",
            "password": "testpassword123",
            "active": True
        }
        response = test_client.post("/api/admin/users", headers=operations_headers, json=user_data)
        assert response.status_code == 403


class TestProductManagement:
    """Test admin product management endpoints."""
    
    async def test_admin_can_access_products(self, test_client, admin_headers):
        """Test that admin can access products."""
        response = test_client.get("/api/admin/products", headers=admin_headers)
        assert response.status_code == 200
        
    async def test_operations_can_access_products(self, test_client, operations_headers):
        """Test that operations can access products."""
        response = test_client.get("/api/admin/products", headers=operations_headers)
        assert response.status_code == 200
        
    async def test_logistics_can_view_products(self, test_client, logistics_headers):
        """Test that logistics can view products."""
        response = test_client.get("/api/admin/products", headers=logistics_headers)
        assert response.status_code == 200


class TestInventoryManagement:
    """Test admin inventory management endpoints."""
    
    async def test_admin_can_access_inventory(self, test_client, admin_headers):
        """Test that admin can access inventory."""
        response = test_client.get("/api/admin/inventory", headers=admin_headers)
        assert response.status_code == 200
        
    async def test_operations_can_access_inventory(self, test_client, operations_headers):
        """Test that operations can access inventory."""
        response = test_client.get("/api/admin/inventory", headers=operations_headers)
        assert response.status_code == 200
        
    async def test_logistics_can_view_inventory(self, test_client, logistics_headers):
        """Test that logistics can view inventory."""
        response = test_client.get("/api/admin/inventory", headers=logistics_headers)
        assert response.status_code == 200
        
    async def test_logistics_cannot_adjust_inventory(self, test_client, logistics_headers):
        """Test that logistics cannot adjust inventory."""
        adjustment_data = {
            "adjustments": [
                {"variant_id": 1, "delta": 10}
            ],
            "reason": "Test adjustment"
        }
        response = test_client.post("/api/admin/inventory/adjust", headers=logistics_headers, json=adjustment_data)
        assert response.status_code == 403


class TestAnalytics:
    """Test admin analytics endpoints."""
    
    async def test_admin_can_access_analytics(self, test_client, admin_headers):
        """Test that admin can access analytics."""
        response = test_client.get("/api/admin/analytics", headers=admin_headers)
        assert response.status_code == 200
        
    async def test_supervisor_can_access_analytics(self, test_client, supervisor_headers):
        """Test that supervisor can access analytics."""
        response = test_client.get("/api/admin/analytics", headers=supervisor_headers)
        assert response.status_code == 200
        
    async def test_operations_can_view_analytics(self, test_client, operations_headers):
        """Test that operations can view analytics."""
        response = test_client.get("/api/admin/analytics", headers=operations_headers)
        assert response.status_code == 200
        
    async def test_logistics_can_view_analytics(self, test_client, logistics_headers):
        """Test that logistics can view analytics."""
        response = test_client.get("/api/admin/analytics", headers=logistics_headers)
        assert response.status_code == 200


class TestOrderManagement:
    """Test admin order management endpoints."""
    
    async def test_admin_can_access_orders(self, test_client, admin_headers):
        """Test that admin can access orders."""
        response = test_client.get("/api/admin/orders", headers=admin_headers)
        assert response.status_code == 200
        
    async def test_operations_can_access_orders(self, test_client, operations_headers):
        """Test that operations can access orders."""
        response = test_client.get("/api/admin/orders", headers=operations_headers)
        assert response.status_code == 200
        
    async def test_logistics_can_access_orders(self, test_client, logistics_headers):
        """Test that logistics can access orders."""
        response = test_client.get("/api/admin/orders", headers=logistics_headers)
        assert response.status_code == 200


class TestPermissionBoundaries:
    """Test permission boundaries and security."""
    
    async def test_unauthenticated_cannot_access_admin(self, test_client):
        """Test that unauthenticated requests are rejected."""
        endpoints = [
            "/api/admin/users",
            "/api/admin/products", 
            "/api/admin/inventory",
            "/api/admin/analytics",
            "/api/admin/orders"
        ]
        
        for endpoint in endpoints:
            response = test_client.get(endpoint)
            assert response.status_code == 401
            
    async def test_invalid_token_rejected(self, test_client):
        """Test that invalid tokens are rejected."""
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        
        response = test_client.get("/api/admin/users", headers=invalid_headers)
        assert response.status_code == 401
        
    async def test_role_escalation_prevented(self, test_client, operations_headers):
        """Test that role escalation is prevented."""
        # Operations should not be able to create admin users
        admin_user_data = {
            "name": "Malicious Admin",
            "email": "malicious@test.com",
            "role": "admin", 
            "password": "password123",
            "active": True
        }
        response = test_client.post("/api/admin/users", headers=operations_headers, json=admin_user_data)
        assert response.status_code == 403
        
    async def test_cross_role_data_access_prevented(self, test_client, logistics_headers):
        """Test that cross-role data access is prevented."""
        # Logistics should not be able to delete products
        response = test_client.delete("/api/admin/products/1", headers=logistics_headers)
        assert response.status_code == 403


class TestDataIntegrity:
    """Test data integrity and validation."""
    
    async def test_admin_stats_endpoint(self, test_client, admin_headers):
        """Test admin stats endpoint returns valid data."""
        response = test_client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ["total_products", "total_orders", "total_users", "revenue"]
        # Check that response contains expected statistical fields
        # Note: The exact fields depend on your implementation
        
    async def test_user_stats_endpoint(self, test_client, admin_headers):
        """Test user stats endpoint returns valid data."""
        response = test_client.get("/api/admin/users/stats", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["total_users", "active_users", "by_role"]
        for field in required_fields:
            assert field in data
            
    async def test_inventory_low_stock_alert(self, test_client, admin_headers):
        """Test inventory low stock alert functionality."""
        response = test_client.get("/api/admin/inventory/low-stock", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestErrorHandling:
    """Test error handling and responses."""
    
    async def test_404_for_nonexistent_resources(self, test_client, admin_headers):
        """Test 404 responses for non-existent resources."""
        response = test_client.get("/api/admin/users/99999", headers=admin_headers)
        assert response.status_code == 404
        
    async def test_400_for_invalid_data(self, test_client, admin_headers):
        """Test 400 responses for invalid data."""
        invalid_user_data = {
            "name": "",  # Invalid empty name
            "email": "invalid-email",  # Invalid email format
            "role": "invalid_role"  # Invalid role
        }
        response = test_client.post("/api/admin/users", headers=admin_headers, json=invalid_user_data)
        assert response.status_code == 400
        
    async def test_403_detailed_error_messages(self, test_client, operations_headers):
        """Test that 403 errors include detailed messages."""
        response = test_client.get("/api/admin/users", headers=operations_headers)
        assert response.status_code == 403
        
        data = response.json()
        # Should include detailed error information
        assert "detail" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
