from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.mdv.config import settings
from backend.mdv.rate_limit import limiter
from backend.mdv.observability import init_observability
from backend.mdv.db import get_session_factory
from backend.mdv.models import Zone, StateZone
from sqlalchemy import select
from .routers import public, admin, payments
from .routers import auth as auth_router
from .routers import users, orders, wishlist, reviews, admin_users


init_observability("mdv-api")

app = FastAPI(title="MDV API", version="0.1.0")

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
async def startup_seed_reference():
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

# CORS
allowed_origins = [settings.app_url] if settings.app_url else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Routes
app.include_router(public.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(admin_users.router)
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)

