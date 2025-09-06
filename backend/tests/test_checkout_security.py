"""
Security tests for checkout authentication bypass vulnerability.

Tests the fix for the critical security issue where guest checkout
could be used to gain unauthorized access to admin accounts.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from mdv.models import User, Role, Cart, CartItem, Variant, Product, Category
from mdv.password import hash_password


@pytest.fixture
async def setup_test_data(db_session: AsyncSession):
    """Set up test data including admin user and products."""
    
    # Create admin user
    admin_user = User(
        name="Test Admin",
        email="admin@mdv.ng",
        role=Role.admin,
        active=True,
        password_hash=hash_password("admin123")
    )
    db_session.add(admin_user)
    
    # Create supervisor user
    supervisor_user = User(
        name="Test Supervisor", 
        email="supervisor@mdv.ng",
        role=Role.supervisor,
        active=True,
        password_hash=hash_password("super123")
    )
    db_session.add(supervisor_user)
    
    # Create logistics user
    logistics_user = User(
        name="Test Logistics",
        email="logistics@mdv.ng", 
        role=Role.logistics,
        active=True,
        password_hash=hash_password("logistics123")
    )
    db_session.add(logistics_user)
    
    # Create regular customer user
    customer_user = User(
        name="Test Customer",
        email="customer@example.com",
        role=Role.operations,
        active=True,
        password_hash=hash_password("customer123")
    )
    db_session.add(customer_user)
    
    # Create test category and product
    category = Category(
        name="Test Category",
        slug="test-category",
        is_active=True
    )
    db_session.add(category)
    await db_session.flush()
    
    product = Product(
        title="Test Product",
        slug="test-product",
        price=100.0,
        category_id=category.id,
        is_active=True
    )
    db_session.add(product)
    await db_session.flush()
    
    variant = Variant(
        product_id=product.id,
        title="Default",
        price=100.0,
        sku="TEST-001"
    )
    db_session.add(variant)
    await db_session.flush()
    
    # Create test cart with items
    cart = Cart()
    db_session.add(cart)
    await db_session.flush()
    
    cart_item = CartItem(
        cart_id=cart.id,
        variant_id=variant.id,
        qty=1
    )
    db_session.add(cart_item)
    
    await db_session.commit()
    
    return {
        "admin_user": admin_user,
        "supervisor_user": supervisor_user,
        "logistics_user": logistics_user,
        "customer_user": customer_user,
        "cart": cart,
        "variant": variant
    }


class TestCheckoutSecurity:
    """Test suite for checkout security vulnerabilities."""
    
    def test_admin_email_checkout_blocked(self, client: TestClient, setup_test_data):
        """Test that checkout with admin email is blocked."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "admin@mdv.ng",  # Admin email should be blocked
            "address": {
                "name": "Test User",
                "phone": "08000000000",
                "state": "Lagos",
                "city": "Ikeja", 
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        # Should be blocked with 403 Forbidden
        assert response.status_code == 403
        assert "staff account" in response.json()["detail"].lower()
    
    def test_supervisor_email_checkout_blocked(self, client: TestClient, setup_test_data):
        """Test that checkout with supervisor email is blocked."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "supervisor@mdv.ng",
            "address": {
                "name": "Test User",
                "phone": "08000000000", 
                "state": "Lagos",
                "city": "Ikeja",
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        assert response.status_code == 403
        assert "staff account" in response.json()["detail"].lower()
    
    def test_logistics_email_checkout_blocked(self, client: TestClient, setup_test_data):
        """Test that checkout with logistics email is blocked."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "logistics@mdv.ng",
            "address": {
                "name": "Test User",
                "phone": "08000000000",
                "state": "Lagos", 
                "city": "Ikeja",
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        assert response.status_code == 403
        assert "staff account" in response.json()["detail"].lower()
    
    def test_restricted_email_patterns_blocked(self, client: TestClient, setup_test_data):
        """Test that restricted email patterns are blocked."""
        data = setup_test_data
        
        restricted_emails = [
            "administrator@mdv.ng",
            "system@mdv.ng", 
            "staff@mdv.ng",
            "operations@mdv.ng"
        ]
        
        for email in restricted_emails:
            checkout_data = {
                "cart_id": data["cart"].id,
                "email": email,
                "address": {
                    "name": "Test User",
                    "phone": "08000000000",
                    "state": "Lagos",
                    "city": "Ikeja",
                    "street": "Test Street"
                }
            }
            
            response = client.post("/api/checkout/init", json=checkout_data)
            
            assert response.status_code == 403, f"Email {email} should be blocked"
            assert "restricted" in response.json()["detail"].lower()
    
    def test_customer_email_checkout_allowed(self, client: TestClient, setup_test_data):
        """Test that existing customer email checkout is allowed."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "customer@example.com",  # Existing customer
            "address": {
                "name": "Test Customer",
                "phone": "08000000000",
                "state": "Lagos",
                "city": "Ikeja",
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        # Should succeed for existing customer
        assert response.status_code == 200
        assert "authorization_url" in response.json()
    
    def test_new_email_checkout_allowed(self, client: TestClient, setup_test_data):
        """Test that new email checkout creates user properly."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "newuser@example.com",  # New email
            "address": {
                "name": "New User",
                "phone": "08000000000",
                "state": "Lagos",
                "city": "Ikeja", 
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        # Should succeed and create new user
        assert response.status_code == 200
        assert "authorization_url" in response.json()
    
    def test_case_insensitive_email_blocking(self, client: TestClient, setup_test_data):
        """Test that email blocking is case insensitive."""
        data = setup_test_data
        
        checkout_data = {
            "cart_id": data["cart"].id,
            "email": "ADMIN@MDV.NG",  # Uppercase admin email
            "address": {
                "name": "Test User",
                "phone": "08000000000",
                "state": "Lagos",
                "city": "Ikeja",
                "street": "Test Street"
            }
        }
        
        response = client.post("/api/checkout/init", json=checkout_data)
        
        # Should be blocked regardless of case
        assert response.status_code == 403
        assert "restricted" in response.json()["detail"].lower()
