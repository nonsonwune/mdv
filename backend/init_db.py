#!/usr/bin/env python3
"""
Database initialization script for MDV
Creates all tables from SQLAlchemy models and seeds with test data
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import bcrypt

# Import all models to ensure they're registered
from mdv.models.user import User
from mdv.models.category import Category
from mdv.models.product import Product
from mdv.models.cart import Cart
from mdv.models.order import Order
from mdv.models.audit_log import AuditLog
from mdv.models.refund import Refund
from mdv.models.app_settings import AppSettings
from mdv.database import Base

async def init_database():
    """Initialize database with tables and seed data"""

    # Database URL from environment
    database_url = os.getenv('DATABASE_URL', 'postgresql://mdv:mdv@postgres:5432/mdv')

    # Convert to async URL
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)

    print(f"Connecting to database: {database_url}")

    # Create async engine
    engine = create_async_engine(database_url, echo=True)

    try:
        # Create all tables
        print("Creating all tables from SQLAlchemy models...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        print("✅ All tables created successfully!")

        # Create session for seeding
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as session:
            # Check if users already exist
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()

            if user_count == 0:
                print("Seeding database with test users...")

                # Create test users
                admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                ops_password = bcrypt.hashpw("ops123456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

                admin_user = User(
                    name="Admin User",
                    email="admin@mdv.ng",
                    password_hash=admin_password,
                    role="admin",
                    active=True,
                    force_password_change=False
                )

                ops_user = User(
                    name="Operations User",
                    email="operations1@mdv.ng",
                    password_hash=ops_password,
                    role="operations",
                    active=True,
                    force_password_change=False
                )

                session.add(admin_user)
                session.add(ops_user)

                # Create basic categories
                men_category = Category(
                    name="Men",
                    slug="men",
                    description="Men's clothing and accessories",
                    sort_order=1,
                    is_active=True,
                    show_in_navigation=True,
                    navigation_icon="👔"
                )

                women_category = Category(
                    name="Women",
                    slug="women",
                    description="Women's clothing and accessories",
                    sort_order=2,
                    is_active=True,
                    show_in_navigation=True,
                    navigation_icon="👗"
                )

                essentials_category = Category(
                    name="Essentials",
                    slug="essentials",
                    description="Essential items for everyone",
                    sort_order=3,
                    is_active=True,
                    show_in_navigation=True,
                    navigation_icon="⭐"
                )

                sale_category = Category(
                    name="Sale",
                    slug="sale",
                    description="Items on sale",
                    sort_order=4,
                    is_active=True,
                    show_in_navigation=True,
                    navigation_icon="🏷️",
                    is_sale_category=True,
                    auto_sale_threshold=50.0
                )

                session.add(men_category)
                session.add(women_category)
                session.add(essentials_category)
                session.add(sale_category)

                await session.commit()
                print("✅ Database seeded with test users and categories!")

                # Verify users were created
                result = await session.execute(text("SELECT email, role FROM users"))
                users = result.fetchall()
                print("\nCreated users:")
                for user in users:
                    print(f"  - {user.email} ({user.role})")

                # Verify categories were created
                result = await session.execute(text("SELECT name, slug FROM categories"))
                categories = result.fetchall()
                print("\nCreated categories:")
                for category in categories:
                    print(f"  - {category.name} ({category.slug})")

            else:
                print(f"Database already has {user_count} users, skipping seeding")

    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_database())
