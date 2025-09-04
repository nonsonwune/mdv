"""Security middleware for enhanced RBAC and request validation."""
from typing import List, Optional, Callable, Any, Dict
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse, Response
import logging
import time
import uuid
import json
from datetime import datetime
from .models import Role
from .auth import get_current_claims, decode_token

logger = logging.getLogger(__name__)

# Performance metrics tracking
request_metrics = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "avg_response_time": 0.0,
    "slow_requests": 0,  # Requests > 1 second
    "error_rates": {},  # Error rates by status code
}

class SecurityMiddleware:
    """Enhanced security middleware for RBAC and request validation."""
    
    def __init__(
        self,
        allowed_roles: Optional[List[Role]] = None,
        require_active: bool = True,
        log_access: bool = True
    ):
        self.allowed_roles = allowed_roles or []
        self.require_active = require_active
        self.log_access = log_access
        
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        """Process request with security checks and comprehensive logging."""
        start_time = time.time()
        request_id = str(uuid.uuid4())

        # Add request ID to request state for tracking
        request.state.request_id = request_id

        # Log incoming request
        self._log_request(request, request_id)

        # Update metrics
        request_metrics["total_requests"] += 1

        # Skip security for public endpoints
        if self._is_public_endpoint(request.url.path):
            response = await call_next(request)
            self._log_response(request, response, start_time, request_id)
            return response
            
        try:
            # Extract and validate token
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                if self._requires_auth(request.url.path):
                    self._log_auth_failure(request, request_id, "No authorization header")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required"
                    )
                else:
                    response = await call_next(request)
                    self._log_response(request, response, start_time, request_id)
                    return response
            
            token = auth_header.split(" ")[1]
            claims = decode_token(token)
            
            # Validate token claims
            self._validate_token_claims(claims)
            
            # Check role permissions
            if self.allowed_roles:
                self._check_role_permissions(claims, self.allowed_roles)
            
            # Check if user is active
            if self.require_active:
                await self._check_user_active(claims)
            
            # Log access if enabled
            if self.log_access:
                self._log_access(request, claims)
            
            # Add user info to request state
            request.state.user_claims = claims
            request.state.user_id = int(claims.get("sub"))
            request.state.user_role = claims.get("role")
            
            response = await call_next(request)

            # Log response and update metrics
            self._log_response(request, response, start_time, request_id, claims)

            return response
            
        except HTTPException as e:
            self._log_error(request, e, start_time, request_id)
            raise
        except Exception as e:
            self._log_error(request, e, start_time, request_id)
            logger.error(f"Security middleware error [{request_id}]: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Security validation failed"
            )
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public and doesn't require authentication."""
        public_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/api/auth/login",
            "/api/auth/register",
            "/api/products",  # Public product listing
            "/api/categories",  # Public categories
        ]
        
        return any(path.startswith(public_path) for public_path in public_paths)
    
    def _requires_auth(self, path: str) -> bool:
        """Check if endpoint requires authentication."""
        auth_required_paths = [
            "/api/admin",
            "/api/users",
            "/api/orders",
            "/api/cart",
        ]
        
        return any(path.startswith(auth_path) for auth_path in auth_required_paths)
    
    def _validate_token_claims(self, claims: dict) -> None:
        """Validate JWT token claims."""
        required_claims = ["sub", "role", "iat", "exp"]
        
        for claim in required_claims:
            if claim not in claims:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token: missing {claim}"
                )
        
        # Validate user ID format
        try:
            int(claims["sub"])
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: invalid user ID"
            )
        
        # Validate role format
        role_value = claims.get("role")
        try:
            Role(role_value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Invalid role: {role_value}"
            )
    
    def _check_role_permissions(self, claims: dict, allowed_roles: List[Role]) -> None:
        """Check if user role has required permissions."""
        user_role_str = claims.get("role")
        
        try:
            user_role = Role(user_role_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user role"
            )
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires one of {[r.value for r in allowed_roles]}"
            )
    
    async def _check_user_active(self, claims: dict) -> None:
        """Check if user account is active."""
        # This would typically query the database to check user status
        # For now, we assume users are active if they have valid tokens
        # In production, you'd want to check the database
        pass
    
    def _log_request(self, request: Request, request_id: str) -> None:
        """Log incoming request details."""
        logger.info(
            f"Request [{request_id}]: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "content_type": request.headers.get("content-type"),
                "content_length": request.headers.get("content-length"),
                "timestamp": datetime.now().isoformat(),
            }
        )

    def _log_response(self, request: Request, response: Response, start_time: float,
                     request_id: str, claims: Optional[Dict] = None) -> None:
        """Log response details and update metrics."""
        process_time = time.time() - start_time

        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id

        # Update metrics
        if response.status_code < 400:
            request_metrics["successful_requests"] += 1
        else:
            request_metrics["failed_requests"] += 1

        if process_time > 1.0:  # Slow request threshold
            request_metrics["slow_requests"] += 1

        # Update error rates
        status_code = str(response.status_code)
        if status_code not in request_metrics["error_rates"]:
            request_metrics["error_rates"][status_code] = 0
        request_metrics["error_rates"][status_code] += 1

        # Update average response time
        total_requests = request_metrics["total_requests"]
        current_avg = request_metrics["avg_response_time"]
        request_metrics["avg_response_time"] = (current_avg * (total_requests - 1) + process_time) / total_requests

        # Log response
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            f"Response [{request_id}]: {response.status_code} in {process_time:.3f}s",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "response_time": process_time,
                "user_id": claims.get("sub") if claims else None,
                "user_role": claims.get("role") if claims else None,
                "client_ip": request.client.host if request.client else None,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Log slow requests
        if process_time > 1.0:
            logger.warning(
                f"Slow request [{request_id}]: {request.method} {request.url.path} took {process_time:.3f}s"
            )

    def _log_auth_failure(self, request: Request, request_id: str, reason: str) -> None:
        """Log authentication failure."""
        logger.warning(
            f"Auth failure [{request_id}]: {reason}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "reason": reason,
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "timestamp": datetime.now().isoformat(),
            }
        )

    def _log_error(self, request: Request, error: Exception, start_time: float, request_id: str) -> None:
        """Log error details."""
        process_time = time.time() - start_time

        logger.error(
            f"Error [{request_id}]: {type(error).__name__} - {str(error)}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "response_time": process_time,
                "client_ip": request.client.host if request.client else None,
                "timestamp": datetime.now().isoformat(),
            }
        )

    def _log_access(self, request: Request, claims: dict) -> None:
        """Log access attempt for audit purposes."""
        logger.info(
            f"Access: user_id={claims.get('sub')} "
            f"role={claims.get('role')} "
            f"method={request.method} "
            f"path={request.url.path} "
            f"ip={request.client.host if request.client else 'unknown'}"
        )


def create_admin_middleware() -> SecurityMiddleware:
    """Create middleware for admin-only endpoints."""
    return SecurityMiddleware(
        allowed_roles=[Role.admin, Role.supervisor],
        require_active=True,
        log_access=True
    )


def create_staff_middleware() -> SecurityMiddleware:
    """Create middleware for all staff endpoints."""
    return SecurityMiddleware(
        allowed_roles=[Role.admin, Role.supervisor, Role.operations, Role.logistics],
        require_active=True,
        log_access=True
    )


def create_auth_middleware() -> SecurityMiddleware:
    """Create middleware for authenticated endpoints."""
    return SecurityMiddleware(
        allowed_roles=None,  # Allow all authenticated users
        require_active=True,
        log_access=False
    )


def get_middleware_metrics() -> Dict[str, Any]:
    """Get current middleware performance metrics."""
    total_requests = request_metrics["total_requests"]

    if total_requests == 0:
        return {
            "total_requests": 0,
            "success_rate": 0,
            "error_rate": 0,
            "avg_response_time": 0,
            "slow_request_rate": 0,
            "error_breakdown": {},
        }

    success_rate = (request_metrics["successful_requests"] / total_requests) * 100
    error_rate = (request_metrics["failed_requests"] / total_requests) * 100
    slow_request_rate = (request_metrics["slow_requests"] / total_requests) * 100

    return {
        "total_requests": total_requests,
        "successful_requests": request_metrics["successful_requests"],
        "failed_requests": request_metrics["failed_requests"],
        "success_rate": round(success_rate, 2),
        "error_rate": round(error_rate, 2),
        "avg_response_time": round(request_metrics["avg_response_time"], 3),
        "slow_requests": request_metrics["slow_requests"],
        "slow_request_rate": round(slow_request_rate, 2),
        "error_breakdown": request_metrics["error_rates"].copy(),
        "timestamp": datetime.now().isoformat(),
    }


def reset_middleware_metrics() -> None:
    """Reset middleware metrics (useful for testing or periodic resets)."""
    global request_metrics
    request_metrics = {
        "total_requests": 0,
        "successful_requests": 0,
        "failed_requests": 0,
        "avg_response_time": 0.0,
        "slow_requests": 0,
        "error_rates": {},
    }
