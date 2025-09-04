"""
Testing utilities and helpers for MDV API tests.
"""

import json
from typing import Dict, Any, Optional, List, Union
from fastapi.testclient import TestClient
from fastapi import status
import pytest


class APITestHelper:
    """Helper class for API testing with common patterns."""
    
    def __init__(self, client: TestClient):
        self.client = client
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login and return response data."""
        response = self.client.post("/api/auth/login", json={
            "email": email,
            "password": password
        })
        return response.json()
    
    def get_auth_headers(self, token: str) -> Dict[str, str]:
        """Get authorization headers for authenticated requests."""
        return {"Authorization": f"Bearer {token}"}
    
    def assert_success_response(
        self,
        response,
        expected_status: int = status.HTTP_200_OK,
        expected_data_keys: Optional[List[str]] = None
    ):
        """Assert successful API response format."""
        assert response.status_code == expected_status
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "success"
        assert "data" in data
        assert "meta" in data
        
        if expected_data_keys:
            for key in expected_data_keys:
                assert key in data["data"]
    
    def assert_error_response(
        self,
        response,
        expected_status: int,
        expected_error_code: Optional[str] = None,
        expected_message: Optional[str] = None
    ):
        """Assert error API response format."""
        assert response.status_code == expected_status
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "error"
        assert "error" in data
        
        error = data["error"]
        assert "code" in error
        assert "message" in error
        assert "category" in error
        
        if expected_error_code:
            assert error["code"] == expected_error_code
        
        if expected_message:
            assert expected_message in error["message"]
    
    def assert_validation_error(
        self,
        response,
        expected_field: Optional[str] = None,
        expected_message: Optional[str] = None
    ):
        """Assert validation error response."""
        self.assert_error_response(response, status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        data = response.json()
        error = data["error"]
        
        if expected_field or expected_message:
            assert "details" in error
            details = error["details"]
            assert len(details) > 0
            
            if expected_field:
                field_found = any(detail["field"] == expected_field for detail in details)
                assert field_found, f"Field '{expected_field}' not found in validation errors"
            
            if expected_message:
                message_found = any(expected_message in detail["message"] for detail in details)
                assert message_found, f"Message '{expected_message}' not found in validation errors"
    
    def assert_paginated_response(
        self,
        response,
        expected_status: int = status.HTTP_200_OK,
        min_items: int = 0,
        max_items: Optional[int] = None
    ):
        """Assert paginated response format."""
        assert response.status_code == expected_status
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "success"
        assert "data" in data
        assert "pagination" in data
        
        # Check pagination metadata
        pagination = data["pagination"]
        required_pagination_fields = [
            "page", "page_size", "total_items", "total_pages",
            "has_next", "has_previous"
        ]
        for field in required_pagination_fields:
            assert field in pagination
        
        # Check data array
        items = data["data"]
        assert isinstance(items, list)
        assert len(items) >= min_items
        
        if max_items is not None:
            assert len(items) <= max_items
    
    def create_test_user(
        self,
        role: str = "customer",
        auth_headers: Optional[Dict[str, str]] = None,
        **user_data
    ) -> Dict[str, Any]:
        """Create a test user via API."""
        default_data = {
            "name": f"Test {role.title()}",
            "email": f"test_{role}@example.com",
            "password": "testpass123",
            "role": role
        }
        default_data.update(user_data)
        
        headers = auth_headers or {}
        response = self.client.post("/api/admin/users", json=default_data, headers=headers)
        
        if response.status_code == status.HTTP_201_CREATED:
            return response.json()["data"]
        else:
            raise Exception(f"Failed to create user: {response.json()}")
    
    def create_test_product(
        self,
        auth_headers: Dict[str, str],
        **product_data
    ) -> Dict[str, Any]:
        """Create a test product via API."""
        default_data = {
            "title": "Test Product",
            "slug": "test-product",
            "description": "A test product",
            "active": True
        }
        default_data.update(product_data)
        
        response = self.client.post("/api/admin/products", json=default_data, headers=auth_headers)
        
        if response.status_code == status.HTTP_201_CREATED:
            return response.json()["data"]
        else:
            raise Exception(f"Failed to create product: {response.json()}")


class DatabaseTestHelper:
    """Helper class for database testing operations."""
    
    def __init__(self, db_session):
        self.db_session = db_session
    
    def count_records(self, model_class) -> int:
        """Count records in a table."""
        return self.db_session.query(model_class).count()
    
    def get_record_by_id(self, model_class, record_id: int):
        """Get a record by ID."""
        return self.db_session.query(model_class).filter(model_class.id == record_id).first()
    
    def get_record_by_field(self, model_class, field_name: str, value: Any):
        """Get a record by a specific field value."""
        field = getattr(model_class, field_name)
        return self.db_session.query(model_class).filter(field == value).first()
    
    def assert_record_exists(self, model_class, **filters):
        """Assert that a record exists with given filters."""
        query = self.db_session.query(model_class)
        for field, value in filters.items():
            field_attr = getattr(model_class, field)
            query = query.filter(field_attr == value)
        
        record = query.first()
        assert record is not None, f"Record not found with filters: {filters}"
        return record
    
    def assert_record_not_exists(self, model_class, **filters):
        """Assert that a record does not exist with given filters."""
        query = self.db_session.query(model_class)
        for field, value in filters.items():
            field_attr = getattr(model_class, field)
            query = query.filter(field_attr == value)
        
        record = query.first()
        assert record is None, f"Record unexpectedly found with filters: {filters}"


class MockDataGenerator:
    """Generate mock data for testing."""
    
    @staticmethod
    def user_data(role: str = "customer", **overrides) -> Dict[str, Any]:
        """Generate user data."""
        base_data = {
            "name": f"Test {role.title()}",
            "email": f"test_{role}@example.com",
            "password": "TestPass123!",
            "role": role,
            "active": True
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def product_data(**overrides) -> Dict[str, Any]:
        """Generate product data."""
        base_data = {
            "title": "Test Product",
            "slug": "test-product",
            "description": "A comprehensive test product with all features",
            "active": True,
            "meta_title": "Test Product - MDV Store",
            "meta_description": "Buy the best test product at MDV Store"
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def variant_data(**overrides) -> Dict[str, Any]:
        """Generate variant data."""
        base_data = {
            "sku": "TEST-001",
            "price": 99.99,
            "compare_at_price": 129.99,
            "size": "M",
            "color": "Blue",
            "weight": 0.5
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def category_data(**overrides) -> Dict[str, Any]:
        """Generate category data."""
        base_data = {
            "name": "Test Category",
            "slug": "test-category",
            "description": "A test category for testing purposes",
            "active": True
        }
        base_data.update(overrides)
        return base_data
    
    @staticmethod
    def order_data(**overrides) -> Dict[str, Any]:
        """Generate order data."""
        base_data = {
            "email": "customer@example.com",
            "shipping_address": {
                "name": "Test Customer",
                "phone": "+2348012345678",
                "state": "Lagos",
                "city": "Lagos",
                "street": "123 Test Street"
            },
            "billing_address": {
                "name": "Test Customer",
                "phone": "+2348012345678",
                "state": "Lagos",
                "city": "Lagos",
                "street": "123 Test Street"
            }
        }
        base_data.update(overrides)
        return base_data


class TestAssertions:
    """Custom assertions for testing."""
    
    @staticmethod
    def assert_datetime_recent(dt_string: str, max_seconds_ago: int = 60):
        """Assert that a datetime string is recent."""
        from datetime import datetime, timezone
        
        dt = datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = (now - dt).total_seconds()
        
        assert diff <= max_seconds_ago, f"Datetime {dt_string} is not recent (diff: {diff}s)"
    
    @staticmethod
    def assert_email_format(email: str):
        """Assert that a string is a valid email format."""
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        assert re.match(email_pattern, email), f"Invalid email format: {email}"
    
    @staticmethod
    def assert_phone_format(phone: str):
        """Assert that a string is a valid phone format."""
        import re
        # Nigerian phone number format
        phone_pattern = r'^\+234[789]\d{9}$'
        assert re.match(phone_pattern, phone), f"Invalid phone format: {phone}"
    
    @staticmethod
    def assert_slug_format(slug: str):
        """Assert that a string is a valid slug format."""
        import re
        slug_pattern = r'^[a-z0-9-]+$'
        assert re.match(slug_pattern, slug), f"Invalid slug format: {slug}"
        assert not slug.startswith('-'), "Slug cannot start with hyphen"
        assert not slug.endswith('-'), "Slug cannot end with hyphen"
        assert '--' not in slug, "Slug cannot contain consecutive hyphens"


# Pytest markers for test categorization
pytest_markers = {
    "unit": pytest.mark.unit,
    "integration": pytest.mark.integration,
    "api": pytest.mark.api,
    "database": pytest.mark.database,
    "auth": pytest.mark.auth,
    "admin": pytest.mark.admin,
    "customer": pytest.mark.customer,
    "payment": pytest.mark.payment,
    "slow": pytest.mark.slow,
    "external": pytest.mark.external
}


# Test data constants
TEST_CONSTANTS = {
    "VALID_EMAIL": "test@example.com",
    "INVALID_EMAIL": "invalid-email",
    "VALID_PASSWORD": "TestPass123!",
    "WEAK_PASSWORD": "123",
    "VALID_PHONE": "+2348012345678",
    "INVALID_PHONE": "123456",
    "VALID_NIGERIAN_STATES": ["Lagos", "Abuja", "Kano", "Rivers"],
    "INVALID_STATE": "Invalid State"
}
