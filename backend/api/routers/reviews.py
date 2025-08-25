"""
Product review management endpoints with database persistence.
"""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from datetime import datetime

from backend.mdv.auth import get_current_claims, get_current_user_optional
from backend.mdv.models import (
    User, Product, Order, OrderItem, Variant, OrderStatus,
    Review, ReviewVote, ProductImage
)
from ..deps import get_db

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


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
    user_voted_helpful: Optional[bool] = None  # If current user voted

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
    result = await db.execute(
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .join(Variant, OrderItem.variant_id == Variant.id)
        .where(
            and_(
                Order.user_id == user_id,
                Order.status.in_([OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]),
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
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews for a specific product."""
    # Verify product exists
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Build query
    query = select(Review).options(
        selectinload(Review.user),
        selectinload(Review.variant),
        selectinload(Review.votes)
    ).where(Review.product_id == product_id)
    
    # Apply filters
    if rating_filter:
        query = query.where(Review.rating == rating_filter)
    if verified_only:
        query = query.where(Review.verified_purchase == True)
    
    # Apply sorting
    if sort_by == "recent":
        query = query.order_by(desc(Review.created_at))
    elif sort_by == "helpful":
        query = query.order_by(desc(Review.helpful_count), desc(Review.created_at))
    elif sort_by == "rating_high":
        query = query.order_by(desc(Review.rating), desc(Review.created_at))
    elif sort_by == "rating_low":
        query = query.order_by(Review.rating, desc(Review.created_at))
    
    # Count total
    count_query = select(func.count()).select_from(Review).where(Review.product_id == product_id)
    if rating_filter:
        count_query = count_query.where(Review.rating == rating_filter)
    if verified_only:
        count_query = count_query.where(Review.verified_purchase == True)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    # Convert to response format
    review_responses = []
    for review in reviews:
        # Check if current user voted on this review
        user_voted_helpful = None
        if user:
            vote = next((v for v in review.votes if v.user_id == user.id), None)
            if vote:
                user_voted_helpful = vote.is_helpful
        
        review_responses.append(ReviewResponse(
            id=review.id,
            product_id=review.product_id,
            variant_id=review.variant_id,
            user_id=review.user_id,
            user_name=review.user.name if review.user else "Anonymous",
            rating=review.rating,
            title=review.title,
            comment=review.comment,
            would_recommend=review.would_recommend,
            verified_purchase=review.verified_purchase,
            helpful_count=review.helpful_count,
            created_at=review.created_at,
            updated_at=review.updated_at,
            user_voted_helpful=user_voted_helpful
        ))
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total
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
    
    # Get all reviews for statistics
    result = await db.execute(
        select(Review).where(Review.product_id == product_id)
    )
    reviews = result.scalars().all()
    
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
    total_rating = sum(r.rating for r in reviews)
    average_rating = total_rating / total_reviews if total_reviews > 0 else 0
    
    # Rating distribution
    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for review in reviews:
        rating_distribution[str(review.rating)] += 1
    
    # Recommendation percentage
    recommendations = sum(1 for r in reviews if r.would_recommend)
    recommendation_percentage = (recommendations / total_reviews * 100) if total_reviews > 0 else 0
    
    # Verified purchase count
    verified_purchase_count = sum(1 for r in reviews if r.verified_purchase)
    
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
    """Create a new review for a product."""
    user_id = int(claims["sub"])
    
    # Verify product exists
    product = await db.get(Product, request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify variant if provided
    if request.variant_id:
        variant = await db.get(Variant, request.variant_id)
        if not variant or variant.product_id != request.product_id:
            raise HTTPException(status_code=404, detail="Variant not found or doesn't belong to product")
    
    # Check if user already reviewed this product
    existing_review = await db.execute(
        select(Review).where(
            and_(
                Review.product_id == request.product_id,
                Review.user_id == user_id
            )
        )
    )
    if existing_review.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    # Check if user has purchased the product
    verified_purchase = await has_purchased_product(user_id, request.product_id, db)
    
    # Create review
    review = Review(
        product_id=request.product_id,
        user_id=user_id,
        variant_id=request.variant_id,
        rating=request.rating,
        title=request.title,
        comment=request.comment,
        would_recommend=request.would_recommend,
        verified_purchase=verified_purchase
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    
    # Load user for response
    user = await db.get(User, user_id)
    
    return ReviewResponse(
        id=review.id,
        product_id=review.product_id,
        variant_id=review.variant_id,
        user_id=review.user_id,
        user_name=user.name if user else "Anonymous",
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        would_recommend=review.would_recommend,
        verified_purchase=review.verified_purchase,
        helpful_count=0,
        created_at=review.created_at,
        updated_at=review.updated_at
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
    
    # Get review
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership
    if review.user_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own reviews")
    
    # Update fields
    if request.rating is not None:
        review.rating = request.rating
    if request.title is not None:
        review.title = request.title
    if request.comment is not None:
        review.comment = request.comment
    if request.would_recommend is not None:
        review.would_recommend = request.would_recommend
    
    await db.commit()
    await db.refresh(review)
    
    # Load user for response
    user = await db.get(User, user_id)
    
    return ReviewResponse(
        id=review.id,
        product_id=review.product_id,
        variant_id=review.variant_id,
        user_id=review.user_id,
        user_name=user.name if user else "Anonymous",
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        would_recommend=review.would_recommend,
        verified_purchase=review.verified_purchase,
        helpful_count=review.helpful_count,
        created_at=review.created_at,
        updated_at=review.updated_at
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
    
    # Get review
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership (or admin)
    if review.user_id != user_id and claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")
    
    await db.delete(review)
    await db.commit()
    
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
    
    # Get review
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if user is trying to vote on their own review
    if review.user_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot vote on your own review")
    
    # Check if user already voted
    existing_vote = await db.execute(
        select(ReviewVote).where(
            and_(
                ReviewVote.review_id == review_id,
                ReviewVote.user_id == user_id
            )
        )
    )
    vote = existing_vote.scalar_one_or_none()
    
    if vote:
        # Update existing vote
        if vote.is_helpful != request.helpful:
            vote.is_helpful = request.helpful
            # Update helpful count
            if request.helpful:
                review.helpful_count += 1
            else:
                review.helpful_count = max(0, review.helpful_count - 1)
    else:
        # Create new vote
        vote = ReviewVote(
            review_id=review_id,
            user_id=user_id,
            is_helpful=request.helpful
        )
        db.add(vote)
        # Update helpful count
        if request.helpful:
            review.helpful_count += 1
    
    await db.commit()
    
    return {
        "message": "Vote recorded",
        "helpful_count": review.helpful_count
    }


# Get user's review for a product
@router.get("/product/{product_id}/user", response_model=Optional[ReviewResponse])
async def get_user_review_for_product(
    product_id: int,
    claims: dict = Depends(get_current_claims),
    db: AsyncSession = Depends(get_db)
):
    """Get the current user's review for a specific product."""
    user_id = int(claims["sub"])
    
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(
            and_(
                Review.product_id == product_id,
                Review.user_id == user_id
            )
        )
    )
    review = result.scalar_one_or_none()
    
    if not review:
        return None
    
    return ReviewResponse(
        id=review.id,
        product_id=review.product_id,
        variant_id=review.variant_id,
        user_id=review.user_id,
        user_name=review.user.name if review.user else "Anonymous",
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        would_recommend=review.would_recommend,
        verified_purchase=review.verified_purchase,
        helpful_count=review.helpful_count,
        created_at=review.created_at,
        updated_at=review.updated_at
    )
