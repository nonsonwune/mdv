from __future__ import annotations

import logging
import traceback
import uuid
import time
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from mdv.config import settings
from mdv.rate_limit import limiter
from mdv.observability import init_observability
from mdv.db import get_session_factory
from mdv.models import Zone, StateZone, User, Category, Role
from mdv.errors import APIError, create_error_response, ErrorCode, ErrorCategory
from mdv.response_middleware import ResponseStandardizationMiddleware, RequestContextMiddleware, get_request_id, get_processing_time
from mdv.response_schemas import health, success
from sqlalchemy import select
from .routers import public, admin, payments
from .routers import auth as auth_router
from .routers import users, orders, wishlist, reviews, admin_users, admin_products, admin_system, admin_reports, admin_audit
from .routers import security
from . import inventory as inventory_router
from . import analytics as analytics_router


init_observability("mdv-api")

app = FastAPI(title="MDV API", version="0.1.0")

# Track application start time
app.state.start_time = time.time()

# Add rate limit error handler
app.state.limiter = limiter

# Custom rate limit handler with CORS support
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Rate limit exception handler with CORS support and standardized response."""
    error = APIError(
        message="Rate limit exceeded",
        error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
        status_code=429,
        category=ErrorCategory.RATE_LIMIT,
        metadata={"retry_after": 60}
    )

    # Log rate limit exceeded
    logger.warning(
        f"Rate Limit Exceeded [{error.error_id}]: {exc.detail}",
        extra={
            "error_id": error.error_id,
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "origin": request.headers.get("origin"),
        }
    )

    # Get CORS headers
    headers = get_cors_headers(request)

    # Add rate limit headers
    headers.update({
        "X-Error-ID": error.error_id,
        "Retry-After": "60",
    })

    response = create_error_response(error)

    # Add CORS headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response


# Custom APIError handler
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle custom APIError exceptions with CORS support."""
    # Log the error
    logger.warning(
        f"API Error [{exc.error_id}]: {exc.error_code.value} - {exc.message}",
        extra={
            "error_id": exc.error_id,
            "error_code": exc.error_code.value,
            "category": exc.category.value,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "origin": request.headers.get("origin"),
        }
    )

    # Get CORS headers
    headers = get_cors_headers(request)
    headers["X-Error-ID"] = exc.error_id

    response = create_error_response(exc)

    # Add CORS headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response


async def seed_basic_users(db):
    """Seed basic admin users required for the platform."""
    from mdv.models import User, Role
    from mdv.password import hash_password

    # Define the basic users that should exist
    users_to_create = [
        {"name": "Admin User", "email": "admin@mdv.ng", "role": Role.admin, "password": "admin123"},
        {"name": "Supervisor User", "email": "supervisor@mdv.ng", "role": Role.supervisor, "password": "supervisor123"},
        {"name": "Operations User", "email": "operations@mdv.ng", "role": Role.operations, "password": "operations123"},
        {"name": "Logistics User", "email": "logistics@mdv.ng", "role": Role.logistics, "password": "logistics123"},
    ]

    created_count = 0
    for user_data in users_to_create:
        # Check if user already exists
        existing = await db.execute(
            select(User).where(User.email == user_data["email"])
        )

        if existing.scalar_one_or_none():
            print(f"✓ User exists: {user_data['name']} ({user_data['email']})")
        else:
            # Create new user
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                role=user_data["role"],
                active=True,
                password_hash=hash_password(user_data["password"])
            )
            db.add(user)
            created_count += 1
            print(f"✓ Created user: {user_data['name']} ({user_data['email']}) - Role: {user_data['role'].value}")

    return created_count


async def seed_basic_categories(db):
    """Seed basic categories required for the platform."""
    from mdv.models import Category

    # Define the categories that match frontend expectations
    categories_to_create = [
        {"name": "Men's Collection", "slug": "men", "show_in_navigation": True, "sort_order": 1},
        {"name": "Women's Collection", "slug": "women", "show_in_navigation": True, "sort_order": 2},
        {"name": "Essentials", "slug": "essentials", "show_in_navigation": True, "sort_order": 3},
        {"name": "Sale & Clearance", "slug": "sale", "show_in_navigation": True, "sort_order": 4},
    ]

    created_count = 0
    for cat_data in categories_to_create:
        # Check if category already exists
        existing = await db.execute(
            select(Category).where(Category.slug == cat_data["slug"])
        )

        if existing.scalar_one_or_none():
            print(f"✓ Category exists: {cat_data['name']} ({cat_data['slug']})")
        else:
            # Create new category
            category = Category(
                name=cat_data["name"],
                slug=cat_data["slug"],
                is_active=True,
                show_in_navigation=cat_data.get("show_in_navigation", True),
                sort_order=cat_data.get("sort_order", 0)
            )
            db.add(category)
            created_count += 1
            print(f"✓ Created category: {cat_data['name']} ({cat_data['slug']})")

    return created_count


@app.on_event("startup")
async def startup_seed_reference():
    """Seed reference data on startup - non-blocking with error handling"""

    # Log webhook configuration info
    if settings.paystack_secret_key:
        # Determine the correct webhook URL
        if settings.app_url and "mdv-web" in settings.app_url:
            webhook_url = settings.app_url.replace("mdv-web", "mdv-api") + "/api/paystack/webhook"
        else:
            webhook_url = "https://mdv-api-production.up.railway.app/api/paystack/webhook"

        print("=" * 60)
        print("PAYSTACK WEBHOOK CONFIGURATION")
        print("=" * 60)
        print(f"Webhook URL to configure in Paystack dashboard:")
        print(f"  {webhook_url}")
        print(f"Required events: charge.success, charge.failed")
        print(f"Secret key configured: {'Yes' if settings.paystack_secret_key else 'No'}")
        print("=" * 60)

    try:
        Session = get_session_factory()
        async with Session() as db:
            # Seed users first
            print("=" * 50)
            print("Seeding basic users...")
            print("=" * 50)
            user_count = await seed_basic_users(db)

            # Seed categories
            print("=" * 50)
            print("Seeding basic categories...")
            print("=" * 50)
            category_count = await seed_basic_categories(db)

            # Seed Zones and state mapping if empty
            existing_zones = (await db.execute(select(Zone))).scalars().first()
            if not existing_zones:
                lagos = Zone(name="Lagos", fee=1000)
                north = Zone(name="North", fee=2000)
                other = Zone(name="Other Zone", fee=1500)
                db.add_all([lagos, north, other])
                await db.flush()
                # Map Lagos state -> Lagos zone (basic seed)
                db.add(StateZone(state="Lagos", zone_id=lagos.id))
                print("✓ Reference zones seeded successfully")

            await db.commit()
            print(f"✓ Seeding complete: {user_count} users, {category_count} categories created")

    except Exception as e:
        print(f"Warning: Failed to seed reference data: {e}")
        print("Continuing without seeding - database might not be ready yet")
        # Don't fail startup if database is not ready

# CORS Configuration - Fixed to properly handle frontend origins
# The APP_URL should point to the frontend URL, not the API URL
def get_allowed_origins():
    """Get the list of allowed origins for CORS"""
    origins = []
    
    # In production, use specific origins
    if settings.env == "production":
        # Add the production frontend URL
        origins.append("https://mdv-web-production.up.railway.app")
        
        # Also check if APP_URL is properly set (it should be the frontend URL)
        if settings.app_url and not settings.app_url.startswith("mdv-api"):
            # Ensure it has a protocol
            if not settings.app_url.startswith("http"):
                origins.append(f"https://{settings.app_url}")
            else:
                origins.append(settings.app_url)
    else:
        # In development, allow localhost origins
        origins.extend([
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8080"
        ])
        
        # Also add the configured APP_URL if it's not an API URL
        if settings.app_url and not settings.app_url.startswith("mdv-api"):
            if not settings.app_url.startswith("http"):
                origins.append(f"http://{settings.app_url}")
            else:
                origins.append(settings.app_url)
    
    # Remove duplicates and return
    return list(set(origins))

allowed_origins = get_allowed_origins()
print(f"CORS: Allowed origins: {allowed_origins}")

# Add response standardization middleware
app.add_middleware(ResponseStandardizationMiddleware)

# Add request context middleware
app.add_middleware(RequestContextMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Enhanced health check endpoints
@app.get("/health")
async def health_check(request: Request):
    """Basic health check - lightweight endpoint for load balancers."""
    uptime_seconds = time.time() - app.state.start_time if hasattr(app.state, 'start_time') else None

    return health(
        service_name="mdv-api",
        version="0.1.0",
        environment=settings.env,
        uptime_seconds=uptime_seconds
    ).dict()


@app.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe - checks if the application is running."""
    return {
        "status": "alive",
        "service": "mdv-api",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
        "uptime": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else None
    }


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe - checks if the application is ready to serve traffic."""
    from mdv.db import get_database_health
    from mdv.middleware import get_middleware_metrics

    health_status = {
        "status": "ready",
        "service": "mdv-api",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }

    overall_healthy = True

    # Database health check
    try:
        db_health = get_database_health()
        health_status["checks"]["database"] = {
            "status": "healthy" if db_health.get("healthy", False) else "unhealthy",
            "details": db_health
        }
        if not db_health.get("healthy", False):
            overall_healthy = False
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False

    # Middleware metrics check
    try:
        middleware_metrics = get_middleware_metrics()
        error_rate = middleware_metrics.get("error_rate", 0)
        health_status["checks"]["middleware"] = {
            "status": "healthy" if error_rate < 50 else "degraded",  # 50% error rate threshold
            "error_rate": error_rate,
            "total_requests": middleware_metrics.get("total_requests", 0)
        }
        if error_rate >= 50:
            overall_healthy = False
    except Exception as e:
        health_status["checks"]["middleware"] = {
            "status": "unknown",
            "error": str(e)
        }

    # Memory usage check (if available)
    try:
        import psutil
        memory = psutil.virtual_memory()
        health_status["checks"]["memory"] = {
            "status": "healthy" if memory.percent < 90 else "warning",
            "usage_percent": memory.percent,
            "available_mb": memory.available // (1024 * 1024)
        }
    except ImportError:
        health_status["checks"]["memory"] = {
            "status": "unknown",
            "error": "psutil not available"
        }
    except Exception as e:
        health_status["checks"]["memory"] = {
            "status": "error",
            "error": str(e)
        }

    # Update overall status
    if not overall_healthy:
        health_status["status"] = "not_ready"

    # Return appropriate status code
    status_code = 200 if overall_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content=health_status
    )


@app.get("/health/detailed")
async def detailed_health_check(request: Request):
    """Comprehensive health check with detailed system information."""
    from mdv.db import get_database_health, get_pool_status
    from mdv.middleware import get_middleware_metrics

    start_time = time.time()
    checks = {}
    metrics = {}
    overall_status = "healthy"

    # Database health and metrics
    try:
        db_health = get_database_health()
        pool_status = get_pool_status()

        health_status["checks"]["database"] = {
            "status": "healthy" if db_health.get("healthy", False) else "unhealthy",
            "response_time_ms": None,  # Will be calculated
            "details": db_health
        }

        health_status["metrics"]["database"] = pool_status

        if not db_health.get("healthy", False):
            overall_healthy = False

    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "error",
            "error": str(e)
        }
        overall_healthy = False

    # Middleware metrics
    try:
        middleware_metrics = get_middleware_metrics()
        health_status["metrics"]["requests"] = middleware_metrics

        error_rate = middleware_metrics.get("error_rate", 0)
        avg_response_time = middleware_metrics.get("avg_response_time", 0)

        health_status["checks"]["middleware"] = {
            "status": "healthy" if error_rate < 10 and avg_response_time < 1.0 else "degraded",
            "error_rate": error_rate,
            "avg_response_time": avg_response_time
        }

        if error_rate >= 50:  # Critical threshold
            overall_healthy = False

    except Exception as e:
        health_status["checks"]["middleware"] = {
            "status": "error",
            "error": str(e)
        }

    # System resources
    try:
        import psutil

        # Memory
        memory = psutil.virtual_memory()
        health_status["metrics"]["memory"] = {
            "total_mb": memory.total // (1024 * 1024),
            "available_mb": memory.available // (1024 * 1024),
            "used_mb": memory.used // (1024 * 1024),
            "percent": memory.percent
        }

        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        health_status["metrics"]["cpu"] = {
            "percent": cpu_percent,
            "count": psutil.cpu_count()
        }

        # Disk
        disk = psutil.disk_usage('/')
        health_status["metrics"]["disk"] = {
            "total_gb": disk.total // (1024 * 1024 * 1024),
            "free_gb": disk.free // (1024 * 1024 * 1024),
            "used_gb": disk.used // (1024 * 1024 * 1024),
            "percent": (disk.used / disk.total) * 100
        }

        # System health checks
        health_status["checks"]["system"] = {
            "status": "healthy",
            "memory_ok": memory.percent < 90,
            "cpu_ok": cpu_percent < 90,
            "disk_ok": (disk.used / disk.total) * 100 < 90
        }

        if memory.percent >= 95 or cpu_percent >= 95 or (disk.used / disk.total) * 100 >= 95:
            health_status["checks"]["system"]["status"] = "critical"
            overall_healthy = False
        elif memory.percent >= 80 or cpu_percent >= 80 or (disk.used / disk.total) * 100 >= 80:
            health_status["checks"]["system"]["status"] = "warning"

    except ImportError:
        health_status["checks"]["system"] = {
            "status": "unknown",
            "error": "psutil not available"
        }
    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "error",
            "error": str(e)
        }

    # External dependencies (Redis, etc.)
    try:
        # Test Redis connection if configured
        if hasattr(settings, 'redis_url') and settings.redis_url:
            import redis
            redis_client = redis.from_url(settings.redis_url)
            redis_client.ping()
            health_status["dependencies"]["redis"] = {
                "status": "healthy",
                "url": settings.redis_url.split('@')[-1] if '@' in settings.redis_url else "configured"
            }
        else:
            health_status["dependencies"]["redis"] = {
                "status": "not_configured"
            }
    except Exception as e:
        health_status["dependencies"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        # Redis failure is not critical for basic API functionality

    # Calculate total health check time
    health_check_time = (time.time() - start_time) * 1000
    health_status["health_check_duration_ms"] = round(health_check_time, 2)

    # Update overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
    elif any(check.get("status") == "warning" for check in health_status["checks"].values()):
        health_status["status"] = "degraded"

    return health_status

@app.get("/")
async def root():
    return {"message": "MDV API is running", "version": "0.1.0"}

# Set up logging
logger = logging.getLogger(__name__)

# Helper function to generate CORS headers
def get_cors_headers(request: Request) -> Dict[str, str]:
    """Generate CORS headers for error responses."""
    headers = {}
    origin = request.headers.get("origin")

    # Always include CORS headers for allowed origins
    if origin in allowed_origins:
        headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "*",
        })
    elif settings.env == "development":
        # In development, be more permissive
        headers.update({
            "Access-Control-Allow-Origin": origin or "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "*",
        })

    return headers


# Custom exception handlers to ensure CORS headers are included in error responses

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Enhanced HTTP exception handler with CORS support and standardized response."""
    # Map HTTP status codes to error codes
    error_code_mapping = {
        401: ErrorCode.TOKEN_INVALID,
        403: ErrorCode.INSUFFICIENT_PERMISSIONS,
        404: ErrorCode.RESOURCE_NOT_FOUND,
        409: ErrorCode.RESOURCE_ALREADY_EXISTS,
        422: ErrorCode.INVALID_INPUT,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.INTERNAL_SERVER_ERROR,
    }

    error_code = error_code_mapping.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR)

    # Create standardized error
    error = APIError(
        message=str(exc.detail),
        error_code=error_code,
        status_code=exc.status_code,
        category=ErrorCategory.INTERNAL if exc.status_code >= 500 else ErrorCategory.VALIDATION,
        user_message=str(exc.detail) if exc.status_code < 500 else None
    )

    # Log the error with context
    logger.warning(
        f"HTTP Exception [{error.error_id}]: {exc.status_code} - {exc.detail}",
        extra={
            "error_id": error.error_id,
            "status_code": exc.status_code,
            "detail": str(exc.detail),
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "origin": request.headers.get("origin"),
        }
    )

    # Get CORS headers
    headers = get_cors_headers(request)
    headers["X-Error-ID"] = error.error_id

    response = create_error_response(error)

    # Add CORS headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response

@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    """Enhanced validation error handler with CORS support and standardized response."""
    from mdv.errors import ErrorDetail

    # Convert validation errors to standardized format
    error_details = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"]) if error.get("loc") else None
        error_details.append(ErrorDetail(
            field=field,
            message=error.get("msg", "Validation error"),
            code=error.get("type", "validation_error")
        ))

    # Create standardized error
    error = APIError(
        message=f"Validation failed with {len(exc.errors())} errors",
        error_code=ErrorCode.INVALID_INPUT,
        status_code=400,
        category=ErrorCategory.VALIDATION,
        details=error_details
    )

    # Log validation errors with context
    logger.warning(
        f"Validation Error [{error.error_id}]: {len(exc.errors())} validation errors",
        extra={
            "error_id": error.error_id,
            "validation_errors": exc.errors(),
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "origin": request.headers.get("origin"),
        }
    )

    # Get CORS headers
    headers = get_cors_headers(request)
    headers["X-Error-ID"] = error.error_id

    response = create_error_response(error)

    # Add CORS headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Enhanced general exception handler with CORS support and standardized response."""
    # Get exception details
    exc_type = type(exc).__name__
    exc_message = str(exc)
    exc_traceback = traceback.format_exc()

    # Create standardized error
    error = APIError(
        message=f"Unhandled {exc_type}: {exc_message}",
        error_code=ErrorCode.INTERNAL_SERVER_ERROR,
        status_code=500,
        category=ErrorCategory.INTERNAL,
        internal_message=exc_traceback,
        metadata={
            "exception_type": exc_type,
            "exception_message": exc_message,
        } if settings.env in ["development", "staging"] else {}
    )

    # Log the error with full context
    logger.error(
        f"Unhandled Exception [{error.error_id}]: {exc_type} - {exc_message}",
        extra={
            "error_id": error.error_id,
            "exception_type": exc_type,
            "exception_message": exc_message,
            "traceback": exc_traceback,
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "origin": request.headers.get("origin"),
            "query_params": dict(request.query_params),
        }
    )

    # Print to console for immediate debugging (can be removed in production)
    print(f"Unhandled exception [{error.error_id}]: {exc}")
    print(exc_traceback)

    # Get CORS headers
    headers = get_cors_headers(request)
    headers["X-Error-ID"] = error.error_id

    response = create_error_response(error)

    # Add CORS headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response

# Debug endpoint to check CORS configuration (remove in production)
@app.get("/debug/cors")
async def debug_cors():
    return {
        "allowed_origins": allowed_origins,
        "app_url": settings.app_url,
        "env": settings.env
    }

# Test endpoint for API connectivity
@app.get("/api/test")
async def api_test():
    return {
        "status": "ok",
        "service": "mdv-api",
        "message": "API is responding correctly",
        "timestamp": datetime.now().isoformat()
    }

# Routes
app.include_router(public.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(admin_users.router)
app.include_router(admin_products.router)
app.include_router(admin_system.router)
app.include_router(admin_reports.router)
app.include_router(admin_audit.router)
app.include_router(inventory_router.router)
app.include_router(analytics_router.router)
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
app.include_router(security.router)
