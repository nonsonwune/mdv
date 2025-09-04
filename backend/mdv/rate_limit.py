"""
Enhanced rate limiting middleware for API endpoints with adaptive limits and security features.
"""
import time
import logging
from typing import Dict, Optional, Callable, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque

from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)

# Enhanced rate limiting storage
class EnhancedRateLimitStorage:
    """Enhanced in-memory storage with additional security features."""

    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.failed_attempts: Dict[str, deque] = defaultdict(deque)
        self.blocked_ips: Dict[str, datetime] = {}
        self.suspicious_ips: set = set()

    def is_blocked(self, key: str) -> bool:
        """Check if IP is currently blocked."""
        if key in self.blocked_ips:
            if datetime.now() > self.blocked_ips[key]:
                del self.blocked_ips[key]
                return False
            return True
        return False

    def block_ip(self, key: str, duration_minutes: int = 15):
        """Block IP for specified duration."""
        self.blocked_ips[key] = datetime.now() + timedelta(minutes=duration_minutes)
        logger.warning(f"IP {key} blocked for {duration_minutes} minutes due to suspicious activity")

    def record_failed_attempt(self, key: str):
        """Record a failed authentication attempt."""
        now = time.time()
        self.failed_attempts[key].append(now)

        # Keep only last hour of attempts
        cutoff = now - 3600
        while self.failed_attempts[key] and self.failed_attempts[key][0] < cutoff:
            self.failed_attempts[key].popleft()

        # Check for suspicious activity
        if len(self.failed_attempts[key]) >= 10:  # 10 failed attempts in an hour
            self.suspicious_ips.add(key)
            self.block_ip(key, 30)  # Block for 30 minutes

    def get_failed_attempts_count(self, key: str, window_minutes: int = 60) -> int:
        """Get number of failed attempts in the specified window."""
        now = time.time()
        cutoff = now - (window_minutes * 60)

        # Clean old attempts
        while self.failed_attempts[key] and self.failed_attempts[key][0] < cutoff:
            self.failed_attempts[key].popleft()

        return len(self.failed_attempts[key])

# Global storage instance
rate_limit_storage = EnhancedRateLimitStorage()

def get_client_identifier(request: Request) -> str:
    """Get client identifier for rate limiting with enhanced detection."""
    # Primary: Use IP address
    ip = get_remote_address(request)

    # Secondary: Consider user agent for additional fingerprinting
    user_agent = request.headers.get("user-agent", "")

    # For authenticated requests, consider user ID
    if hasattr(request.state, 'user_id'):
        return f"user:{request.state.user_id}"

    # Check for forwarded headers (load balancer/proxy)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # Use the first IP in the chain
        ip = forwarded_for.split(",")[0].strip()

    return ip

def adaptive_rate_limit_key(request: Request) -> str:
    """Adaptive rate limiting based on request characteristics."""
    client_id = get_client_identifier(request)

    # Check if IP is suspicious
    if client_id in rate_limit_storage.suspicious_ips:
        return f"suspicious:{client_id}"

    # Check failed attempts
    failed_count = rate_limit_storage.get_failed_attempts_count(client_id)
    if failed_count >= 5:
        return f"high_risk:{client_id}"

    return client_id

# Create enhanced limiter
limiter = Limiter(
    key_func=adaptive_rate_limit_key,
    default_limits=["200 per minute"],
    storage_uri="memory://",
    headers_enabled=True,
    swallow_errors=False
)

# Custom rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Enhanced rate limit exceeded handler with logging and security features."""
    client_id = get_client_identifier(request)
    path = request.url.path

    # Log the rate limit violation
    logger.warning(
        f"Rate limit exceeded for {client_id} on {path}. "
        f"Limit: {exc.detail}, Retry after: {exc.retry_after}s"
    )

    # Record as potential security event
    rate_limit_storage.record_failed_attempt(client_id)

    # Check if this should trigger IP blocking
    failed_count = rate_limit_storage.get_failed_attempts_count(client_id, 10)  # 10 minutes
    if failed_count >= 5:
        rate_limit_storage.block_ip(client_id, 15)  # Block for 15 minutes
        logger.warning(f"IP {client_id} blocked due to excessive rate limit violations")

    # Return appropriate HTTP response
    response_detail = {
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please slow down.",
        "retry_after": exc.retry_after,
        "limit": exc.detail
    }

    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=response_detail,
        headers={"Retry-After": str(exc.retry_after)}
    )

# Enhanced rate limit configurations
RATE_LIMITS = {
    # Authentication endpoints (strict limits)
    "login": "5 per minute",
    "login_failed": "3 per minute",  # Even stricter for failed attempts
    "register": "3 per minute",
    "password_reset": "3 per minute",
    "password_change": "5 per minute",
    "logout": "10 per minute",

    # Admin endpoints
    "admin_action": "30 per minute",
    "admin_sensitive": "10 per minute",

    # API endpoints
    "api_read": "100 per minute",
    "api_write": "30 per minute",
    "api_default": "60 per minute",

    # Public endpoints
    "public": "200 per minute",

    # Suspicious/high-risk clients
    "suspicious": "10 per minute",
    "high_risk": "20 per minute",
}

# Endpoint-specific rate limits
ENDPOINT_LIMITS = {
    "/api/auth/login": "login",
    "/api/auth/register": "register",
    "/api/auth/password-reset": "password_reset",
    "/api/auth/password-change": "password_change",
    "/api/auth/logout": "logout",
    "/api/admin": "admin_action",
    "/api/products": "public",
    "/api/categories": "public",
}

def get_rate_limit_for_request(request: Request) -> str:
    """Get appropriate rate limit for the request."""
    path = request.url.path
    client_id = get_client_identifier(request)

    # Check if client is blocked
    if rate_limit_storage.is_blocked(client_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="IP temporarily blocked due to suspicious activity"
        )

    # Check for suspicious activity
    if client_id in rate_limit_storage.suspicious_ips:
        return RATE_LIMITS["suspicious"]

    # Check failed attempts
    failed_count = rate_limit_storage.get_failed_attempts_count(client_id)
    if failed_count >= 5:
        return RATE_LIMITS["high_risk"]

    # Check endpoint-specific limits
    for endpoint, limit_key in ENDPOINT_LIMITS.items():
        if path.startswith(endpoint):
            return RATE_LIMITS[limit_key]

    # Default limit
    return RATE_LIMITS["api_default"]

def record_auth_failure(request: Request):
    """Record authentication failure for rate limiting."""
    client_id = get_client_identifier(request)
    rate_limit_storage.record_failed_attempt(client_id)

    # Log for monitoring
    logger.warning(
        f"Authentication failure recorded for {client_id} on {request.url.path}"
    )

def adaptive_rate_limit(limit_type: str = "api_default"):
    """Decorator for adaptive rate limiting based on client behavior."""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            client_id = get_client_identifier(request)

            # Check if blocked
            if rate_limit_storage.is_blocked(client_id):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Access temporarily blocked",
                    headers={"Retry-After": "900"}  # 15 minutes
                )

            # Get appropriate limit
            if client_id in rate_limit_storage.suspicious_ips:
                limit = RATE_LIMITS["suspicious"]
            elif rate_limit_storage.get_failed_attempts_count(client_id) >= 5:
                limit = RATE_LIMITS["high_risk"]
            else:
                limit = RATE_LIMITS.get(limit_type, RATE_LIMITS["api_default"])

            # Apply rate limit
            try:
                # This would integrate with slowapi's limiter
                # For now, we'll implement basic checking
                return await func(request, *args, **kwargs)
            except RateLimitExceeded as e:
                # Log rate limit exceeded
                logger.warning(f"Rate limit exceeded for {client_id}: {limit}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {limit}",
                    headers={"Retry-After": str(e.retry_after)}
                )

        return wrapper
    return decorator


class SecurityRateLimitMiddleware:
    """Enhanced security-focused rate limiting middleware."""

    def __init__(self):
        self.storage = rate_limit_storage

    async def __call__(self, request: Request, call_next: Callable) -> Any:
        """Process request with security-focused rate limiting."""
        client_id = get_client_identifier(request)
        path = request.url.path

        # Check if IP is blocked
        if self.storage.is_blocked(client_id):
            logger.warning(f"Blocked IP {client_id} attempted access to {path}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Access temporarily blocked due to suspicious activity",
                headers={"Retry-After": "900"}
            )

        # Check for suspicious patterns
        if self._is_suspicious_request(request, client_id):
            self.storage.suspicious_ips.add(client_id)
            logger.warning(f"Suspicious request pattern detected from {client_id}")

        # Process request
        try:
            response = await call_next(request)

            # Check response for auth failures
            if self._is_auth_failure(response, path):
                self.storage.record_failed_attempt(client_id)

            return response

        except HTTPException as e:
            # Record auth failures
            if e.status_code == 401 and "auth" in path:
                self.storage.record_failed_attempt(client_id)
            raise

    def _is_suspicious_request(self, request: Request, client_id: str) -> bool:
        """Detect suspicious request patterns."""

        # Check for common attack patterns
        path = request.url.path.lower()
        query = str(request.url.query).lower()

        # SQL injection patterns
        sql_patterns = ["union", "select", "drop", "insert", "delete", "'", "--", "/*"]
        if any(pattern in path or pattern in query for pattern in sql_patterns):
            return True

        # Path traversal patterns
        if "../" in path or "..%2f" in path:
            return True

        # Common vulnerability scanning patterns
        vuln_patterns = ["/admin", "/wp-admin", "/.env", "/config", "/backup"]
        if any(pattern in path for pattern in vuln_patterns):
            return True

        # Excessive failed attempts
        if self.storage.get_failed_attempts_count(client_id, 10) >= 3:  # 3 failures in 10 minutes
            return True

        return False

    def _is_auth_failure(self, response: Any, path: str) -> bool:
        """Check if response indicates authentication failure."""
        return (
            hasattr(response, 'status_code') and
            response.status_code == 401 and
            "auth" in path
        )


def create_rate_limited_endpoint(limit_type: str = "api_default"):
    """Create a rate-limited endpoint decorator."""
    def decorator(func):
        # Apply slowapi limiter
        rate_limit = RATE_LIMITS.get(limit_type, RATE_LIMITS["api_default"])
        limited_func = limiter.limit(rate_limit)(func)

        # Add adaptive limiting
        adaptive_func = adaptive_rate_limit(limit_type)(limited_func)

        return adaptive_func
    return decorator


def get_rate_limit_middleware():
    """Get the enhanced rate limiting middleware."""
    return SecurityRateLimitMiddleware


def get_slowapi_middleware():
    """Get the SlowAPI middleware instance."""
    return SlowAPIMiddleware


# Rate limiting utilities
def get_client_stats(client_id: str) -> Dict[str, Any]:
    """Get rate limiting statistics for a client."""
    return {
        "client_id": client_id,
        "is_blocked": rate_limit_storage.is_blocked(client_id),
        "is_suspicious": client_id in rate_limit_storage.suspicious_ips,
        "failed_attempts_1h": rate_limit_storage.get_failed_attempts_count(client_id, 60),
        "failed_attempts_10m": rate_limit_storage.get_failed_attempts_count(client_id, 10),
        "blocked_until": rate_limit_storage.blocked_ips.get(client_id)
    }


def unblock_client(client_id: str) -> bool:
    """Manually unblock a client (admin function)."""
    if client_id in rate_limit_storage.blocked_ips:
        del rate_limit_storage.blocked_ips[client_id]
        rate_limit_storage.suspicious_ips.discard(client_id)
        logger.info(f"Client {client_id} manually unblocked")
        return True
    return False


def reset_client_stats(client_id: str):
    """Reset rate limiting statistics for a client."""
    rate_limit_storage.failed_attempts[client_id].clear()
    rate_limit_storage.suspicious_ips.discard(client_id)
    if client_id in rate_limit_storage.blocked_ips:
        del rate_limit_storage.blocked_ips[client_id]
    logger.info(f"Rate limiting stats reset for client {client_id}")


def setup_rate_limit_handler(app):
    """Setup rate limit exceeded handler for FastAPI app."""
    from fastapi import FastAPI

    if isinstance(app, FastAPI):
        app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
        logger.info("Rate limit exceeded handler registered with FastAPI app")
    else:
        logger.warning("App is not a FastAPI instance, cannot register rate limit handler")
