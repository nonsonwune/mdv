#!/usr/bin/env python
"""
Pytest: verify the FastAPI app imports and routers are registered.
"""

def test_server_startup_import_and_routes():
    from backend.api.main import app

    assert app is not None

    routes = [route.path for route in app.routes]
    assert isinstance(routes, list)

    expected_prefixes = ['/api/users', '/api/orders', '/api/wishlist', '/api/reviews']
    for prefix in expected_prefixes:
        assert any(r.startswith(prefix) for r in routes), f"Missing routes for prefix {prefix}"
