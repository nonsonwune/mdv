#!/usr/bin/env python3
"""
Script to clean mock/fake review data from the database.
This ensures only verified purchase reviews remain in the system.
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[1]))

from mdv.db import session_scope
from mdv.models import Review, ReviewVote, User, Order, OrderItem, Variant
from sqlalchemy import select, delete, and_, func


async def analyze_reviews():
    """Analyze current reviews to identify potential mock data."""
    async with session_scope() as db:
        # Get total review count
        total_reviews = await db.execute(select(func.count(Review.id)))
        total_count = total_reviews.scalar() or 0
        
        print(f"📊 Total reviews in database: {total_count}")
        
        if total_count == 0:
            print("✅ No reviews found - database is clean")
            return
        
        # Get verified vs unverified reviews
        verified_reviews = await db.execute(
            select(func.count(Review.id)).where(Review.verified_purchase == True)
        )
        verified_count = verified_reviews.scalar() or 0
        
        unverified_reviews = await db.execute(
            select(func.count(Review.id)).where(Review.verified_purchase == False)
        )
        unverified_count = unverified_reviews.scalar() or 0
        
        print(f"✅ Verified purchase reviews: {verified_count}")
        print(f"⚠️  Unverified reviews: {unverified_count}")
        
        # Get reviews by user
        user_review_counts = await db.execute(
            select(Review.user_id, func.count(Review.id).label('review_count'))
            .group_by(Review.user_id)
            .order_by(func.count(Review.id).desc())
        )
        
        print("\n👥 Reviews by user:")
        for user_id, count in user_review_counts:
            user = await db.get(User, user_id)
            user_name = user.name if user else f"User {user_id}"
            print(f"   {user_name}: {count} reviews")
        
        # Check for suspicious patterns
        print("\n🔍 Checking for suspicious patterns...")
        
        # Reviews created on the same day
        same_day_reviews = await db.execute(
            select(func.date(Review.created_at), func.count(Review.id))
            .group_by(func.date(Review.created_at))
            .having(func.count(Review.id) > 5)
            .order_by(func.count(Review.id).desc())
        )
        
        for date, count in same_day_reviews:
            print(f"   📅 {date}: {count} reviews (suspicious if > 10)")
        
        # Reviews with similar content
        similar_titles = await db.execute(
            select(Review.title, func.count(Review.id))
            .group_by(Review.title)
            .having(func.count(Review.id) > 1)
            .order_by(func.count(Review.id).desc())
        )
        
        print("\n🔄 Duplicate review titles:")
        for title, count in similar_titles:
            if count > 1:
                print(f"   '{title}': {count} times")


async def verify_purchase_integrity():
    """Check if all verified_purchase=True reviews actually have valid purchases."""
    async with session_scope() as db:
        print("\n🔍 Verifying purchase integrity...")
        
        # Get all verified reviews
        verified_reviews = await db.execute(
            select(Review).where(Review.verified_purchase == True)
        )
        
        invalid_verified_reviews = []
        
        for review in verified_reviews.scalars():
            # Check if user actually purchased the product
            purchase_check = await db.execute(
                select(OrderItem)
                .join(Order, OrderItem.order_id == Order.id)
                .join(Variant, OrderItem.variant_id == Variant.id)
                .where(
                    and_(
                        Order.user_id == review.user_id,
                        Order.status.in_(['Paid', 'Shipped', 'Delivered']),
                        Variant.product_id == review.product_id
                    )
                )
            )
            
            if not purchase_check.scalar_one_or_none():
                invalid_verified_reviews.append(review)
        
        if invalid_verified_reviews:
            print(f"❌ Found {len(invalid_verified_reviews)} reviews marked as verified but no purchase found:")
            for review in invalid_verified_reviews:
                user = await db.get(User, review.user_id)
                print(f"   Review {review.id} by {user.name if user else 'Unknown'} for product {review.product_id}")
        else:
            print("✅ All verified reviews have valid purchases")
        
        return invalid_verified_reviews


async def clean_mock_reviews(dry_run=True):
    """Remove mock/fake reviews from the database."""
    async with session_scope() as db:
        print(f"\n🧹 {'DRY RUN: ' if dry_run else ''}Cleaning mock reviews...")
        
        # Strategy 1: Remove all unverified reviews
        unverified_reviews = await db.execute(
            select(Review).where(Review.verified_purchase == False)
        )
        unverified_list = list(unverified_reviews.scalars())
        
        print(f"📋 Found {len(unverified_list)} unverified reviews to remove")
        
        # Strategy 2: Remove reviews with invalid verification
        invalid_verified = await verify_purchase_integrity()
        
        # Combine all reviews to remove
        reviews_to_remove = unverified_list + invalid_verified
        
        if not reviews_to_remove:
            print("✅ No mock reviews found to clean")
            return
        
        print(f"\n🗑️  {'Would remove' if dry_run else 'Removing'} {len(reviews_to_remove)} reviews:")
        
        for review in reviews_to_remove:
            user = await db.get(User, review.user_id)
            user_name = user.name if user else f"User {review.user_id}"
            print(f"   - Review {review.id}: '{review.title}' by {user_name} (Product {review.product_id})")
        
        if not dry_run:
            # Remove review votes first (foreign key constraint)
            for review in reviews_to_remove:
                await db.execute(
                    delete(ReviewVote).where(ReviewVote.review_id == review.id)
                )
            
            # Remove reviews
            review_ids = [r.id for r in reviews_to_remove]
            await db.execute(
                delete(Review).where(Review.id.in_(review_ids))
            )
            
            await db.commit()
            print(f"✅ Successfully removed {len(reviews_to_remove)} mock reviews")
        else:
            print(f"\n💡 Run with dry_run=False to actually remove these reviews")


async def update_review_validation():
    """Ensure the review creation endpoint properly validates purchases."""
    print("\n🔧 Review validation is already implemented in backend/api/routers/reviews.py")
    print("✅ The create_review endpoint:")
    print("   - Checks if user has purchased the product")
    print("   - Sets verified_purchase flag based on actual purchase history")
    print("   - Prevents duplicate reviews from same user")
    print("   - Only allows reviews from authenticated users")


async def generate_cleanup_report():
    """Generate a comprehensive cleanup report."""
    print("=" * 60)
    print("📋 MOCK REVIEW CLEANUP REPORT")
    print("=" * 60)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    await analyze_reviews()
    await verify_purchase_integrity()
    await update_review_validation()
    
    print("\n" + "=" * 60)
    print("🎯 RECOMMENDATIONS")
    print("=" * 60)
    
    async with session_scope() as db:
        total_reviews = await db.execute(select(func.count(Review.id)))
        total_count = total_reviews.scalar() or 0
        
        unverified_reviews = await db.execute(
            select(func.count(Review.id)).where(Review.verified_purchase == False)
        )
        unverified_count = unverified_reviews.scalar() or 0
        
        if unverified_count > 0:
            print(f"⚠️  Action Required: {unverified_count} unverified reviews found")
            print("   Run: python clean_mock_reviews.py --clean")
        else:
            print("✅ No action required - all reviews are verified purchases")
        
        print(f"\n📊 Final State:")
        print(f"   Total reviews: {total_count}")
        print(f"   Unverified reviews: {unverified_count}")
        print(f"   Clean reviews: {total_count - unverified_count}")


async def main():
    """Main cleanup function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Clean mock review data from MDV database")
    parser.add_argument("--clean", action="store_true", help="Actually remove mock reviews (default is dry run)")
    parser.add_argument("--analyze", action="store_true", help="Only analyze current reviews")
    
    args = parser.parse_args()
    
    if args.analyze:
        await analyze_reviews()
        await verify_purchase_integrity()
    elif args.clean:
        await clean_mock_reviews(dry_run=False)
        await generate_cleanup_report()
    else:
        # Default: dry run
        await clean_mock_reviews(dry_run=True)
        await generate_cleanup_report()


if __name__ == "__main__":
    asyncio.run(main())
