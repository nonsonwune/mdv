from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from mdv.config import settings
from mdv.rate_limit import limiter
from mdv.observability import init_observability
from mdv.db import get_session_factory
from mdv.models import Zone, StateZone
from sqlalchemy import select
from .routers import public, admin, payments
from .routers import auth as auth_router
from .routers import users, orders, wishlist, reviews, admin_users, admin_products


init_observability("mdv-api")

app = FastAPI(title="MDV API", version="0.1.0")

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
async def startup_seed_reference():
    """Seed reference data on startup - non-blocking with error handling"""
    try:
        # Seed Zones and a minimal state mapping if empty
        Session = get_session_factory()
        async with Session() as db:
            existing = (await db.execute(select(Zone))).scalars().first()
            if not existing:
                lagos = Zone(name="Lagos", fee=1000)
                north = Zone(name="North", fee=2000)
                other = Zone(name="Other Zone", fee=1500)
                db.add_all([lagos, north, other])
                await db.flush()
                # Map Lagos state -> Lagos zone (basic seed)
                db.add(StateZone(state="Lagos", zone_id=lagos.id))
                await db.commit()
                print("✓ Reference data seeded successfully")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Health check endpoint (no database required)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mdv-api", "version": "0.1.0"}

@app.get("/")
async def root():
    return {"message": "MDV API is running", "version": "0.1.0"}

# Debug endpoint to check CORS configuration (remove in production)
@app.get("/debug/cors")
async def debug_cors():
    return {
        "allowed_origins": allowed_origins,
        "app_url": settings.app_url,
        "env": settings.env
    }

# Routes
app.include_router(public.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(admin_users.router)
app.include_router(admin_products.router)
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
