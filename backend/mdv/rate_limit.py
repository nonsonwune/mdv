"""
Rate limiting middleware for API endpoints.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Create limiter with IP-based rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],  # Default global limit
    storage_uri="memory://"  # Use in-memory storage (Redis recommended for production)
)

# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "login": "5 per minute",           # Strict limit for login attempts
    "register": "3 per minute",         # Limit registration attempts
    "password_reset": "3 per minute",   # Limit password reset requests
    "admin_action": "30 per minute",    # Moderate limit for admin actions
    "api_default": "60 per minute",     # Default API limit
}


def get_rate_limit_middleware():
    """Get the SlowAPI middleware instance."""
    return SlowAPIMiddleware
