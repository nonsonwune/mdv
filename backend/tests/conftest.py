"""
Comprehensive test configuration and utilities for MDV API testing.
"""

import pytest
import asyncio
from typing import Dict, Any, Optional, Generator, AsyncGenerator
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import tempfile
import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import httpx

from mdv.db import get_session_factory, Base
from mdv.models import User, Product, Variant, Category, Order, OrderItem
from mdv.auth import create_access_token
from mdv.password import hash_password as get_password_hash
from mdv.config import settings
from api.main import app
from api.deps import get_db


# Test database setup
@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    # Use in-memory SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    return engine


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """Create test session factory."""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session(test_session_factory) -> Generator[Session, None, None]:
    """Create test database session."""
    session = test_session_factory()
    
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session) -> Generator[TestClient, None, None]:
    """Create test client with database session override."""
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# User fixtures
@pytest.fixture
def admin_user(db_session) -> User:
    """Create admin user for testing."""
    user = User(
        name="Admin User",
        email="admin@mdv.ng",
        password_hash=get_password_hash("admin123"),
        role="admin",
        active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def staff_user(db_session) -> User:
    """Create staff user for testing."""
    user = User(
        name="Staff User",
        email="staff@mdv.ng",
        password_hash=get_password_hash("staff123"),
        role="staff",
        active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_user(db_session) -> User:
    """Create customer user for testing."""
    user = User(
        name="Customer User",
        email="customer@example.com",
        password_hash=get_password_hash("customer123"),
        role="customer",
        active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# Authentication fixtures
@pytest.fixture
def admin_token(admin_user) -> str:
    """Create admin access token."""
    return create_access_token(
        data={"sub": admin_user.email, "role": admin_user.role, "user_id": admin_user.id}
    )


@pytest.fixture
def staff_token(staff_user) -> str:
    """Create staff access token."""
    return create_access_token(
        data={"sub": staff_user.email, "role": staff_user.role, "user_id": staff_user.id}
    )


@pytest.fixture
def customer_token(customer_user) -> str:
    """Create customer access token."""
    return create_access_token(
        data={"sub": customer_user.email, "role": customer_user.role, "user_id": customer_user.id}
    )


@pytest.fixture
def auth_headers(admin_token) -> Dict[str, str]:
    """Create authorization headers."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def staff_auth_headers(staff_token) -> Dict[str, str]:
    """Create staff authorization headers."""
    return {"Authorization": f"Bearer {staff_token}"}


@pytest.fixture
def customer_auth_headers(customer_token) -> Dict[str, str]:
    """Create customer authorization headers."""
    return {"Authorization": f"Bearer {customer_token}"}


# Product fixtures
@pytest.fixture
def category(db_session) -> Category:
    """Create test category."""
    category = Category(
        name="Test Category",
        slug="test-category",
        description="A test category"
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def product(db_session, category) -> Product:
    """Create test product."""
    product = Product(
        title="Test Product",
        slug="test-product",
        description="A test product",
        category_id=category.id,
        active=True
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def variant(db_session, product) -> Variant:
    """Create test variant."""
    variant = Variant(
        product_id=product.id,
        sku="TEST-001",
        price=99.99,
        size="M",
        color="Blue"
    )
    db_session.add(variant)
    db_session.commit()
    db_session.refresh(variant)
    return variant


# Order fixtures
@pytest.fixture
def order(db_session, customer_user) -> Order:
    """Create test order."""
    order = Order(
        user_id=customer_user.id,
        status="pending",
        total=99.99,
        email=customer_user.email,
        shipping_address={
            "name": "Test User",
            "phone": "+2348012345678",
            "state": "Lagos",
            "city": "Lagos",
            "street": "123 Test Street"
        }
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


@pytest.fixture
def order_item(db_session, order, variant) -> OrderItem:
    """Create test order item."""
    item = OrderItem(
        order_id=order.id,
        variant_id=variant.id,
        quantity=2,
        price=variant.price
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


# Mock fixtures
@pytest.fixture
def mock_paystack():
    """Mock Paystack API responses."""
    with patch('mdv.payments.paystack.PaystackClient') as mock_client:
        mock_instance = Mock()
        mock_client.return_value = mock_instance
        
        # Mock successful payment initialization
        mock_instance.initialize_payment.return_value = {
            "status": True,
            "data": {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test123",
                "reference": "test_ref_123"
            }
        }
        
        # Mock successful payment verification
        mock_instance.verify_payment.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "reference": "test_ref_123",
                "amount": 9999,  # Amount in kobo
                "currency": "NGN"
            }
        }
        
        yield mock_instance


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    with patch('mdv.email.send_email') as mock_send:
        mock_send.return_value = True
        yield mock_send


@pytest.fixture
def mock_file_storage():
    """Mock file storage service."""
    with patch('mdv.storage.upload_file') as mock_upload:
        mock_upload.return_value = {
            "url": "https://example.com/test-image.jpg",
            "public_id": "test_image_123"
        }
        yield mock_upload


# Utility functions
class TestDataFactory:
    """Factory for creating test data."""
    
    @staticmethod
    def user_data(role: str = "customer", **overrides) -> Dict[str, Any]:
        """Create user data for testing."""
        base_data = {
            "name": f"Test {role.title()}",
            "email": f"test_{role}@example.com",
            "password": "testpass123",
            "role": role,
            "active": True
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def product_data(**overrides) -> Dict[str, Any]:
        """Create product data for testing."""
        base_data = {
            "title": "Test Product",
            "slug": "test-product",
            "description": "A test product description",
            "active": True
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def variant_data(**overrides) -> Dict[str, Any]:
        """Create variant data for testing."""
        base_data = {
            "sku": "TEST-001",
            "price": 99.99,
            "size": "M",
            "color": "Blue"
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def order_data(**overrides) -> Dict[str, Any]:
        """Create order data for testing."""
        base_data = {
            "email": "customer@example.com",
            "shipping_address": {
                "name": "Test Customer",
                "phone": "+2348012345678",
                "state": "Lagos",
                "city": "Lagos",
                "street": "123 Test Street"
            }
        }
        base_data.update(overrides)
        return base_data


@pytest.fixture
def test_data_factory():
    """Provide test data factory."""
    return TestDataFactory


# Async test utilities
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_client(db_session) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create async test client."""
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


# Test configuration
@pytest.fixture(autouse=True)
def test_settings():
    """Override settings for testing."""
    original_env = settings.env
    original_secret = settings.secret_key
    
    settings.env = "test"
    settings.secret_key = "test-secret-key-for-testing-only"
    
    yield
    
    settings.env = original_env
    settings.secret_key = original_secret


# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_temp_files():
    """Clean up temporary files after tests."""
    temp_files = []
    
    def create_temp_file(suffix=".tmp"):
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        temp_files.append(path)
        return path
    
    yield create_temp_file
    
    # Cleanup
    for file_path in temp_files:
        try:
            os.unlink(file_path)
        except OSError:
            pass
