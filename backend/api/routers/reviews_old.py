"""
Product review management endpoints.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime

from backend.mdv.auth import get_current_claims
from backend.mdv.models import User, Product, Order, OrderItem, Variant, OrderStatus
from ..deps import get_db

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

# Temporary in-memory storage for reviews (should be database table)
product_reviews = {}
review_counter = {"id": 1}


# Schemas
class ReviewCreateRequest(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    title: str = Field(..., max_length=200)
    comment: str = Field(..., max_length=2000)
    variant_id: Optional[int] = None
    would_recommend: bool = True

class ReviewUpdateRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = Field(None, max_length=2000)
    would_recommend: Optional[bool] = None

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    user_id: int
    user_name: str
    rating: int
    title: str
    comment: str
    would_recommend: bool
    verified_purchase: bool
    helpful_count: int = 0
    created_at: datetime
    updated_at: datetime

class ReviewSummaryResponse(BaseModel):
    product_id: int
    average_rating: float
    total_reviews: int
    rating_distribution: dict  # {1: count, 2: count, ..., 5: count}
    recommendation_percentage: float
    verified_purchase_count: int

class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total: int
    page: int
    per_page: int
    has_next: bool

class HelpfulVoteRequest(BaseModel):
    helpful: bool


# Helper function to check if user has purchased product
async def has_purchased_product(user_id: int, product_id: int, db: AsyncSession) -> bool:
    """Check if user has purchased the product."""
    # Query orders for this user that contain the product
    # OrderItem links to Variant, which links to Product
    result = await db.execute(
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Variant, OrderItem.variant_id == Variant.id)
        .where(
            and_(
                Order.user_id == user_id,
                Order.status.in_([OrderStatus.paid, OrderStatus.refunded]),  # Consider paid and refunded as valid purchases
                Variant.product_id == product_id
            )
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


# Get product reviews
@router.get("/product/{product_id}", response_model=ReviewListResponse)
async def get_product_reviews(
    product_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    sort_by: str = Query("recent", regex="^(recent|helpful|rating_high|rating_low)$"),
    rating_filter: Optional[int] = Query(None, ge=1, le=5),
    verified_only: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews for a specific product."""
    # Verify product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get reviews from storage
    reviews = product_reviews.get(product_id, [])
    
    # Apply filters
    if rating_filter:
        reviews = [r for r in reviews if r["rating"] == rating_filter]
    if verified_only:
        reviews = [r for r in reviews if r["verified_purchase"]]
    
    # Sort reviews
    if sort_by == "recent":
        reviews = sorted(reviews, key=lambda x: x["created_at"], reverse=True)
    elif sort_by == "helpful":
        reviews = sorted(reviews, key=lambda x: x["helpful_count"], reverse=True)
    elif sort_by == "rating_high":
        reviews = sorted(reviews, key=lambda x: x["rating"], reverse=True)
    elif sort_by == "rating_low":
        reviews = sorted(reviews, key=lambda x: x["rating"])
    
    # Paginate
    total = len(reviews)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_reviews = reviews[start:end]
    
    # Convert to response format
    review_responses = []
    for review in paginated_reviews:
        # Get user name
        user = await db.get(User, review["user_id"])
        user_name = user.name if user else "Anonymous"
        
        review_responses.append(ReviewResponse(
            id=review["id"],
            product_id=review["product_id"],
            variant_id=review.get("variant_id"),
            user_id=review["user_id"],
            user_name=user_name,
            rating=review["rating"],
            title=review["title"],
            comment=review["comment"],
            would_recommend=review["would_recommend"],
            verified_purchase=review["verified_purchase"],
            helpful_count=review.get("helpful_count", 0),
            created_at=review["created_at"],
            updated_at=review["updated_at"]
        ))
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        page=page,
        per_page=per_page,
        has_next=end < total
    )


# Get review summary for a product
@router.get("/product/{product_id}/summary", response_model=ReviewSummaryResponse)
async def get_review_summary(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get review summary statistics for a product."""
    # Verify product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get reviews from storage
    reviews = product_reviews.get(product_id, [])
    
    if not reviews:
        return ReviewSummaryResponse(
            product_id=product_id,
            average_rating=0,
            total_reviews=0,
            rating_distribution={str(i): 0 for i in range(1, 6)},
            recommendation_percentage=0,
            verified_purchase_count=0
        )
    
    # Calculate statistics
    total_reviews = len(reviews)
    total_rating = sum(r["rating"] for r in reviews)
    average_rating = total_rating / total_reviews if total_reviews > 0 else 0
    
    # Rating distribution
    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for review in reviews:
        rating_distribution[str(review["rating"])] += 1
    
    # Recommendation percentage
    recommendations = sum(1 for r in reviews if r["would_recommend"])
    recommendation_percentage = (recommendations / total_reviews * 100) if total_reviews > 0 else 0
    
    # Verified purchase count
    verified_purchase_count = sum(1 for r in reviews if r["verified_purchase"])
    
    return ReviewSummaryResponse(
        product_id=product_id,
        average_rating=round(average_rating, 1),
        total_reviews=total_reviews,
        rating_distribution=rating_distribution,
        recommendation_percentage=round(recommendation_percentage, 1),
        verified_purchase_count=verified_purchase_count
    )


# Create a review
@router.post("", response_model=ReviewResponse)
async def create_review(
    request: ReviewCreateRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Create a new product review."""
    user_id = int(claims["sub"])
    
    # Verify product exists
    product = await db.get(Product, request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing_reviews = product_reviews.get(request.product_id, [])
    if any(r["user_id"] == user_id for r in existing_reviews):
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Check if verified purchase
    verified_purchase = await has_purchased_product(user_id, request.product_id, db)
    
    # Create review
    review = {
        "id": review_counter["id"],
        "product_id": request.product_id,
        "variant_id": request.variant_id,
        "user_id": user_id,
        "rating": request.rating,
        "title": request.title,
        "comment": request.comment,
        "would_recommend": request.would_recommend,
        "verified_purchase": verified_purchase,
        "helpful_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    review_counter["id"] += 1
    
    # Store review
    if request.product_id not in product_reviews:
        product_reviews[request.product_id] = []
    product_reviews[request.product_id].append(review)
    
    # Get user name for response
    user = await db.get(User, user_id)
    user_name = user.name if user else "Anonymous"
    
    return ReviewResponse(
        id=review["id"],
        product_id=review["product_id"],
        variant_id=review.get("variant_id"),
        user_id=review["user_id"],
        user_name=user_name,
        rating=review["rating"],
        title=review["title"],
        comment=review["comment"],
        would_recommend=review["would_recommend"],
        verified_purchase=review["verified_purchase"],
        helpful_count=review.get("helpful_count", 0),
        created_at=review["created_at"],
        updated_at=review["updated_at"]
    )


# Update a review
@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    request: ReviewUpdateRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing review."""
    user_id = int(claims["sub"])
    
    # Find review
    review = None
    for product_id, reviews in product_reviews.items():
        for r in reviews:
            if r["id"] == review_id:
                review = r
                break
        if review:
            break
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership
    if review["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only update your own reviews")
    
    # Update fields
    if request.rating is not None:
        review["rating"] = request.rating
    if request.title is not None:
        review["title"] = request.title
    if request.comment is not None:
        review["comment"] = request.comment
    if request.would_recommend is not None:
        review["would_recommend"] = request.would_recommend
    
    review["updated_at"] = datetime.utcnow()
    
    # Get user name for response
    user = await db.get(User, user_id)
    user_name = user.name if user else "Anonymous"
    
    return ReviewResponse(
        id=review["id"],
        product_id=review["product_id"],
        variant_id=review.get("variant_id"),
        user_id=review["user_id"],
        user_name=user_name,
        rating=review["rating"],
        title=review["title"],
        comment=review["comment"],
        would_recommend=review["would_recommend"],
        verified_purchase=review["verified_purchase"],
        helpful_count=review.get("helpful_count", 0),
        created_at=review["created_at"],
        updated_at=review["updated_at"]
    )


# Delete a review
@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Delete a review."""
    user_id = int(claims["sub"])
    roles = claims.get("roles", [])
    
    # Find and remove review
    review_found = False
    for product_id, reviews in product_reviews.items():
        for i, r in enumerate(reviews):
            if r["id"] == review_id:
                # Check ownership or admin role
                if r["user_id"] != user_id and "admin" not in roles:
                    raise HTTPException(status_code=403, detail="You can only delete your own reviews")
                
                reviews.pop(i)
                review_found = True
                break
        if review_found:
            break
    
    if not review_found:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted successfully"}


# Mark review as helpful
@router.post("/{review_id}/helpful")
async def mark_review_helpful(
    review_id: int,
    request: HelpfulVoteRequest,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Mark a review as helpful or not helpful."""
    user_id = int(claims["sub"])
    
    # Find review
    review = None
    for product_id, reviews in product_reviews.items():
        for r in reviews:
            if r["id"] == review_id:
                review = r
                break
        if review:
            break
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Prevent self-voting
    if review["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot vote on your own review")
    
    # Track user votes (in production, this would be in database)
    if "user_votes" not in review:
        review["user_votes"] = {}
    
    # Check if user already voted
    if user_id in review["user_votes"]:
        old_vote = review["user_votes"][user_id]
        if old_vote and not request.helpful:
            review["helpful_count"] -= 1
        elif not old_vote and request.helpful:
            review["helpful_count"] += 1
    else:
        if request.helpful:
            review["helpful_count"] = review.get("helpful_count", 0) + 1
    
    review["user_votes"][user_id] = request.helpful
    
    return {
        "message": "Vote recorded",
        "helpful_count": review.get("helpful_count", 0)
    }


# Get user's reviews
@router.get("/user/me", response_model=ReviewListResponse)
async def get_my_reviews(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get all reviews by the current user."""
    user_id = int(claims["sub"])
    
    # Collect all user's reviews
    user_reviews = []
    for product_id, reviews in product_reviews.items():
        for review in reviews:
            if review["user_id"] == user_id:
                user_reviews.append(review)
    
    # Sort by recent
    user_reviews = sorted(user_reviews, key=lambda x: x["created_at"], reverse=True)
    
    # Paginate
    total = len(user_reviews)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_reviews = user_reviews[start:end]
    
    # Get user name
    user = await db.get(User, user_id)
    user_name = user.name if user else "Anonymous"
    
    # Convert to response format
    review_responses = []
    for review in paginated_reviews:
        review_responses.append(ReviewResponse(
            id=review["id"],
            product_id=review["product_id"],
            variant_id=review.get("variant_id"),
            user_id=review["user_id"],
            user_name=user_name,
            rating=review["rating"],
            title=review["title"],
            comment=review["comment"],
            would_recommend=review["would_recommend"],
            verified_purchase=review["verified_purchase"],
            helpful_count=review.get("helpful_count", 0),
            created_at=review["created_at"],
            updated_at=review["updated_at"]
        ))
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        page=page,
        per_page=per_page,
        has_next=end < total
    )
