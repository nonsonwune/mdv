"""
Slug Service

Handles hierarchical URL slug generation and conflict resolution for categories.
"""

import re
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from mdv.models import Category


class SlugService:
    """Service for managing hierarchical category slugs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    @staticmethod
    def generate_slug(text: str) -> str:
        """
        Generate a URL-friendly slug from text.
        
        Args:
            text: The text to convert to a slug
            
        Returns:
            A URL-friendly slug
        """
        if not text:
            return ""
        
        # Convert to lowercase
        slug = text.lower()
        
        # Replace spaces and special characters with hyphens
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        # Ensure it's not empty
        if not slug:
            slug = "category"
        
        return slug
    
    async def get_category_hierarchy_path(self, category: Category) -> List[str]:
        """
        Get the full hierarchy path for a category as a list of slugs.
        
        Args:
            category: The category to get the path for
            
        Returns:
            List of slugs from root to the category
        """
        path = []
        current = category
        
        # Build path from category up to root
        while current:
            path.insert(0, current.slug)
            
            if current.parent_id:
                # Get parent category
                parent_stmt = select(Category).where(Category.id == current.parent_id)
                parent_result = await self.db.execute(parent_stmt)
                current = parent_result.scalar_one_or_none()
            else:
                current = None
        
        return path
    
    async def get_full_category_path(self, category: Category) -> str:
        """
        Get the full hierarchical path for a category.
        
        Args:
            category: The category to get the path for
            
        Returns:
            Full path like "men/shirts" or "women/accessories/bags"
        """
        path_segments = await self.get_category_hierarchy_path(category)
        return "/".join(path_segments)
    
    async def check_slug_conflict(self, slug: str, parent_id: Optional[int] = None, exclude_id: Optional[int] = None) -> bool:
        """
        Check if a slug conflicts with existing categories at the same level.
        
        Args:
            slug: The slug to check
            parent_id: The parent category ID (None for root level)
            exclude_id: Category ID to exclude from the check (for updates)
            
        Returns:
            True if there's a conflict, False otherwise
        """
        stmt = select(Category).where(
            and_(
                Category.slug == slug,
                Category.parent_id == parent_id
            )
        )
        
        if exclude_id:
            stmt = stmt.where(Category.id != exclude_id)
        
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        return existing is not None
    
    async def generate_unique_slug(self, base_text: str, parent_id: Optional[int] = None, exclude_id: Optional[int] = None) -> str:
        """
        Generate a unique slug that doesn't conflict with existing categories.
        
        Args:
            base_text: The base text to generate slug from
            parent_id: The parent category ID (None for root level)
            exclude_id: Category ID to exclude from conflict checking
            
        Returns:
            A unique slug
        """
        base_slug = self.generate_slug(base_text)
        
        # Check if the base slug is available
        if not await self.check_slug_conflict(base_slug, parent_id, exclude_id):
            return base_slug
        
        # If there's a conflict, try numbered variations
        counter = 1
        while counter <= 100:  # Prevent infinite loops
            candidate_slug = f"{base_slug}-{counter}"
            
            if not await self.check_slug_conflict(candidate_slug, parent_id, exclude_id):
                return candidate_slug
            
            counter += 1
        
        # If we still can't find a unique slug, add timestamp
        import time
        timestamp_slug = f"{base_slug}-{int(time.time())}"
        return timestamp_slug
    
    async def validate_hierarchy_path(self, category_id: int, new_parent_id: Optional[int]) -> Tuple[bool, Optional[str]]:
        """
        Validate that moving a category to a new parent won't create circular references.
        
        Args:
            category_id: The category being moved
            new_parent_id: The new parent category ID
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not new_parent_id:
            return True, None
        
        # Check if the new parent is the category itself
        if new_parent_id == category_id:
            return False, "A category cannot be its own parent"
        
        # Check if the new parent is a descendant of the category
        current_parent_id = new_parent_id
        visited_ids = set()
        
        while current_parent_id:
            if current_parent_id in visited_ids:
                return False, "Circular reference detected in category hierarchy"
            
            if current_parent_id == category_id:
                return False, "Cannot move category under its own descendant"
            
            visited_ids.add(current_parent_id)
            
            # Get the parent of the current parent
            parent_stmt = select(Category.parent_id).where(Category.id == current_parent_id)
            parent_result = await self.db.execute(parent_stmt)
            parent_row = parent_result.scalar_one_or_none()
            
            current_parent_id = parent_row if parent_row else None
        
        return True, None
    
    async def update_category_slug(self, category: Category, new_name: Optional[str] = None, new_parent_id: Optional[int] = None) -> str:
        """
        Update a category's slug, ensuring uniqueness and handling hierarchy changes.
        
        Args:
            category: The category to update
            new_name: New name for the category (if changing)
            new_parent_id: New parent ID (if changing hierarchy)
            
        Returns:
            The new slug
        """
        # Use new name if provided, otherwise use existing name
        name_for_slug = new_name if new_name is not None else category.name
        
        # Use new parent if provided, otherwise use existing parent
        parent_id_for_slug = new_parent_id if new_parent_id is not None else category.parent_id
        
        # Validate hierarchy if parent is changing
        if new_parent_id is not None and new_parent_id != category.parent_id:
            is_valid, error_message = await self.validate_hierarchy_path(category.id, new_parent_id)
            if not is_valid:
                raise ValueError(error_message)
        
        # Generate unique slug
        new_slug = await self.generate_unique_slug(
            name_for_slug,
            parent_id_for_slug,
            category.id
        )
        
        return new_slug
    
    async def get_category_by_path(self, path: str) -> Optional[Category]:
        """
        Get a category by its full hierarchical path.
        
        Args:
            path: The full path like "men/shirts" or "women/accessories/bags"
            
        Returns:
            The category if found, None otherwise
        """
        if not path:
            return None
        
        path_segments = [segment.strip() for segment in path.split('/') if segment.strip()]
        
        if not path_segments:
            return None
        
        current_parent_id = None
        current_category = None
        
        # Walk through the path segments
        for segment in path_segments:
            stmt = select(Category).where(
                and_(
                    Category.slug == segment,
                    Category.parent_id == current_parent_id
                )
            )
            
            result = await self.db.execute(stmt)
            current_category = result.scalar_one_or_none()
            
            if not current_category:
                return None
            
            current_parent_id = current_category.id
        
        return current_category
    
    async def get_category_children_paths(self, category: Category) -> List[str]:
        """
        Get all full paths for a category's children and descendants.
        
        Args:
            category: The parent category
            
        Returns:
            List of full paths for all descendants
        """
        paths = []
        
        # Get direct children
        children_stmt = select(Category).where(Category.parent_id == category.id)
        children_result = await self.db.execute(children_stmt)
        children = children_result.scalars().all()
        
        for child in children:
            # Get full path for this child
            child_path = await self.get_full_category_path(child)
            paths.append(child_path)
            
            # Recursively get paths for grandchildren
            grandchildren_paths = await self.get_category_children_paths(child)
            paths.extend(grandchildren_paths)
        
        return paths


async def generate_category_slug(db: AsyncSession, name: str, parent_id: Optional[int] = None, exclude_id: Optional[int] = None) -> str:
    """
    Convenience function to generate a unique category slug.
    
    Args:
        db: Database session
        name: Category name to generate slug from
        parent_id: Parent category ID
        exclude_id: Category ID to exclude from conflict checking
        
    Returns:
        A unique slug
    """
    service = SlugService(db)
    return await service.generate_unique_slug(name, parent_id, exclude_id)


async def get_category_by_path(db: AsyncSession, path: str) -> Optional[Category]:
    """
    Convenience function to get a category by its hierarchical path.
    
    Args:
        db: Database session
        path: The hierarchical path like "men/shirts"
        
    Returns:
        The category if found, None otherwise
    """
    service = SlugService(db)
    return await service.get_category_by_path(path)
