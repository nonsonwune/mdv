"""Security middleware for enhanced RBAC and request validation."""
from typing import List, Optional, Callable, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging
import time
from .models import Role
from .auth import get_current_claims, decode_token

logger = logging.getLogger(__name__)

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
        
    async def __call__(self, request: Request, call_next: Callable) -> JSONResponse:
        """Process request with security checks."""
        start_time = time.time()
        
        # Skip security for public endpoints
        if self._is_public_endpoint(request.url.path):
            response = await call_next(request)
            return response
            
        try:
            # Extract and validate token
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                if self._requires_auth(request.url.path):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required"
                    )
                else:
                    response = await call_next(request)
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
            
            # Log response time
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
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
