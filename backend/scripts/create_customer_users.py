#!/usr/bin/env python3
"""
Create customer users for testing and production.

This script creates customer users that can be used for testing
the customer login functionality.

Usage:
    python scripts/create_customer_users.py [--environment prod|dev]
"""

import asyncio
import argparse
import sys
import os
from sqlalchemy import select

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Role
from password import hash_password


async def create_customer_users(environment: str = "dev"):
    """Create customer users for testing."""
    
    # Define customer users to create
    if environment == "prod":
        # Production customer users
        customers_to_create = [
            {
                "email": "customer@mdv.ng",
                "name": "Customer User",
                "role": Role.customer,
                "password": "customer123",
                "description": "Main customer test account"
            },
            {
                "email": "test.customer@mdv.ng", 
                "name": "Test Customer",
                "role": Role.customer,
                "password": "testcustomer123",
                "description": "Secondary customer test account"
            }
        ]
    else:
        # Development customer users
        customers_to_create = [
            {
                "email": "customer@mdv.ng",
                "name": "Customer User",
                "role": Role.customer,
                "password": "customer123",
                "description": "Main customer test account"
            },
            {
                "email": "customer@example.com",
                "name": "Example Customer",
                "role": Role.customer,
                "password": "customer123",
                "description": "Example customer account"
            },
            {
                "email": "test@example.com",
                "name": "Test User",
                "role": Role.customer,
                "password": "test123",
                "description": "Test customer account"
            }
        ]
    
    async with SessionLocal() as db:
        print(f"\n🔐 Creating customer users for {environment.upper()} environment...\n")
        print("-" * 70)
        
        created_count = 0
        updated_count = 0
        
        for user_data in customers_to_create:
            # Check if user already exists
            existing = await db.execute(
                select(User).where(User.email == user_data["email"])
            )
            user = existing.scalar_one_or_none()
            
            if user:
                # Update existing user to ensure correct role and password
                original_role = user.role
                user.name = user_data["name"]
                user.role = user_data["role"]
                user.password_hash = hash_password(user_data["password"])
                user.active = True
                
                if original_role != user_data["role"]:
                    print(f"📝 Updated: {user_data['email']:30} | Role: {original_role.value} → {user_data['role'].value}")
                    updated_count += 1
                else:
                    print(f"✓  Exists:  {user_data['email']:30} | Role: {user_data['role'].value:10} | {user_data['description']}")
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
                print(f"✅ Created: {user_data['email']:30} | Role: {user_data['role'].value:10} | {user_data['description']}")
                created_count += 1
        
        await db.commit()
        
        # Display summary
        print("\n" + "-"*70)
        print(f"Summary: {created_count} customers created, {updated_count} customers updated")
        print("-"*70 + "\n")
        
        # Show all customer users in system
        print("CUSTOMER USERS IN SYSTEM:")
        print("-"*70)
        print(f"{'Email':35} {'Name':25} {'Status':8}")
        print("-"*70)
        
        customer_users = await db.execute(
            select(User).where(User.role == Role.customer).order_by(User.email)
        )
        for user in customer_users.scalars().all():
            status = "Active" if user.active else "Inactive"
            print(f"{user.email:35} {user.name:25} {status:8}")
        
        # Display test credentials
        print("\n" + "="*70)
        print(f" CUSTOMER TEST CREDENTIALS ({environment.upper()})")
        print("="*70)
        
        for user_data in customers_to_create:
            print(f"\nCustomer Account:")
            print(f"  Email: {user_data['email']}")
            print(f"  Password: {user_data['password']}")
            print(f"  Description: {user_data['description']}")
        
        print("\n" + "="*70)
        print(" CUSTOMER LOGIN TESTING")
        print("="*70)
        print(f"""
Customer Login URLs:
  Local: http://localhost:3000/customer-login
  Production: https://mdv-web-production.up.railway.app/customer-login

API Testing:
  curl -X POST {f"https://mdv-api-production.up.railway.app" if environment == "prod" else "http://localhost:8000"}/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{{"email": "customer@mdv.ng", "password": "customer123"}}'
        """)
        
        print("\n✅ Customer users setup completed successfully!")
        print("="*70 + "\n")


async def main():
    parser = argparse.ArgumentParser(description="Create customer users for testing")
    parser.add_argument("--environment", choices=["dev", "prod"], default="dev", 
                       help="Environment to create users for (default: dev)")
    
    args = parser.parse_args()
    
    try:
        await create_customer_users(args.environment)
        print("🎉 Customer user creation completed successfully!")
    except Exception as e:
        print(f"❌ Failed to create customer users: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
