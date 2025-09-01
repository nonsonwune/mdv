"""
Dynamic size system for different product types.
Determines appropriate size options based on product category.
"""

from typing import List, Dict, Optional
from enum import Enum


class SizeType(str, Enum):
    """Types of sizing systems."""
    CLOTHING = "clothing"
    SHOES = "shoes"
    ACCESSORIES = "accessories"
    ONE_SIZE = "one_size"


class SizeSystem:
    """Manages size options for different product types."""
    
    # Define size options for each size type
    SIZE_OPTIONS = {
        SizeType.CLOTHING: [
            {"value": "XS", "label": "Extra Small", "sort_order": 1},
            {"value": "S", "label": "Small", "sort_order": 2},
            {"value": "M", "label": "Medium", "sort_order": 3},
            {"value": "L", "label": "Large", "sort_order": 4},
            {"value": "XL", "label": "Extra Large", "sort_order": 5},
            {"value": "XXL", "label": "2X Large", "sort_order": 6},
        ],
        SizeType.SHOES: [
            {"value": "6", "label": "Size 6", "sort_order": 1},
            {"value": "6.5", "label": "Size 6.5", "sort_order": 2},
            {"value": "7", "label": "Size 7", "sort_order": 3},
            {"value": "7.5", "label": "Size 7.5", "sort_order": 4},
            {"value": "8", "label": "Size 8", "sort_order": 5},
            {"value": "8.5", "label": "Size 8.5", "sort_order": 6},
            {"value": "9", "label": "Size 9", "sort_order": 7},
            {"value": "9.5", "label": "Size 9.5", "sort_order": 8},
            {"value": "10", "label": "Size 10", "sort_order": 9},
            {"value": "10.5", "label": "Size 10.5", "sort_order": 10},
            {"value": "11", "label": "Size 11", "sort_order": 11},
            {"value": "11.5", "label": "Size 11.5", "sort_order": 12},
            {"value": "12", "label": "Size 12", "sort_order": 13},
            {"value": "13", "label": "Size 13", "sort_order": 14},
            {"value": "14", "label": "Size 14", "sort_order": 15},
        ],
        SizeType.ACCESSORIES: [
            {"value": "OS", "label": "One Size", "sort_order": 1},
            {"value": "S", "label": "Small", "sort_order": 2},
            {"value": "M", "label": "Medium", "sort_order": 3},
            {"value": "L", "label": "Large", "sort_order": 4},
        ],
        SizeType.ONE_SIZE: [
            {"value": "OS", "label": "One Size", "sort_order": 1},
        ]
    }
    
    # Map category slugs to size types
    CATEGORY_SIZE_MAPPING = {
        # Men's clothing
        "men-t-shirts": SizeType.CLOTHING,
        "men-shirts": SizeType.CLOTHING,
        "men-pants": SizeType.CLOTHING,
        "men-jackets": SizeType.CLOTHING,
        "men-shoes": SizeType.SHOES,
        "men-accessories": SizeType.ACCESSORIES,
        
        # Women's clothing
        "women-t-shirts": SizeType.CLOTHING,
        "women-shirts": SizeType.CLOTHING,
        "women-pants": SizeType.CLOTHING,
        "women-dresses": SizeType.CLOTHING,
        "women-jackets": SizeType.CLOTHING,
        "women-shoes": SizeType.SHOES,
        "women-accessories": SizeType.ACCESSORIES,
        
        # Essentials
        "essentials-basics": SizeType.CLOTHING,
        "essentials-undergarments": SizeType.CLOTHING,
        "essentials-socks": SizeType.CLOTHING,
        "essentials-sleepwear": SizeType.CLOTHING,
        "essentials-activewear": SizeType.CLOTHING,
        
        # Default fallbacks for main categories
        "men": SizeType.CLOTHING,
        "women": SizeType.CLOTHING,
        "essentials": SizeType.CLOTHING,
        "sale": SizeType.CLOTHING,
    }
    
    @classmethod
    def get_size_type_for_category(cls, category_slug: str) -> SizeType:
        """Get the appropriate size type for a category."""
        return cls.CATEGORY_SIZE_MAPPING.get(category_slug, SizeType.CLOTHING)
    
    @classmethod
    def get_size_options(cls, size_type: SizeType) -> List[Dict[str, any]]:
        """Get size options for a specific size type."""
        return cls.SIZE_OPTIONS.get(size_type, cls.SIZE_OPTIONS[SizeType.CLOTHING])
    
    @classmethod
    def get_size_options_for_category(cls, category_slug: str) -> List[Dict[str, any]]:
        """Get size options for a specific category."""
        size_type = cls.get_size_type_for_category(category_slug)
        return cls.get_size_options(size_type)
    
    @classmethod
    def validate_size_for_category(cls, size: str, category_slug: str) -> bool:
        """Validate if a size is valid for a specific category."""
        valid_sizes = cls.get_size_options_for_category(category_slug)
        return any(option["value"] == size for option in valid_sizes)
    
    @classmethod
    def get_size_label(cls, size: str, category_slug: str) -> str:
        """Get the display label for a size in a specific category."""
        size_options = cls.get_size_options_for_category(category_slug)
        for option in size_options:
            if option["value"] == size:
                return option["label"]
        return size  # Fallback to the size value itself
    
    @classmethod
    def get_all_size_types(cls) -> List[Dict[str, any]]:
        """Get all available size types with their options."""
        return [
            {
                "type": size_type.value,
                "label": size_type.value.replace("_", " ").title(),
                "options": options
            }
            for size_type, options in cls.SIZE_OPTIONS.items()
        ]
    
    @classmethod
    def suggest_sizes_for_new_category(cls, category_name: str, parent_category_slug: Optional[str] = None) -> SizeType:
        """Suggest appropriate size type for a new category based on name and parent."""
        category_name_lower = category_name.lower()
        
        # Check for shoe-related keywords
        if any(keyword in category_name_lower for keyword in ["shoe", "boot", "sneaker", "sandal", "heel"]):
            return SizeType.SHOES
        
        # Check for accessory-related keywords
        if any(keyword in category_name_lower for keyword in ["hat", "cap", "belt", "bag", "wallet", "watch", "jewelry"]):
            return SizeType.ACCESSORIES
        
        # Check for one-size items
        if any(keyword in category_name_lower for keyword in ["scarf", "tie", "pin", "badge"]):
            return SizeType.ONE_SIZE
        
        # Use parent category as fallback
        if parent_category_slug:
            return cls.get_size_type_for_category(parent_category_slug)
        
        # Default to clothing
        return SizeType.CLOTHING


# Helper functions for API usage
def get_category_size_options(category_slug: str) -> Dict[str, any]:
    """Get size information for a category (for API responses)."""
    size_type = SizeSystem.get_size_type_for_category(category_slug)
    size_options = SizeSystem.get_size_options(size_type)
    
    return {
        "size_type": size_type.value,
        "size_type_label": size_type.value.replace("_", " ").title(),
        "options": size_options
    }


def validate_product_size(size: str, category_slug: str) -> bool:
    """Validate a product size for a specific category."""
    return SizeSystem.validate_size_for_category(size, category_slug)


def get_size_display_label(size: str, category_slug: str) -> str:
    """Get the display label for a size."""
    return SizeSystem.get_size_label(size, category_slug)


# Size conversion utilities (for future enhancement)
class SizeConverter:
    """Utilities for size conversions between different systems."""
    
    # US to EU shoe size conversion (approximate)
    US_TO_EU_SHOES = {
        "6": "36",
        "6.5": "37",
        "7": "37.5",
        "7.5": "38",
        "8": "38.5",
        "8.5": "39",
        "9": "40",
        "9.5": "40.5",
        "10": "41",
        "10.5": "42",
        "11": "42.5",
        "11.5": "43",
        "12": "44",
        "13": "45",
        "14": "46",
    }
    
    @classmethod
    def us_to_eu_shoe_size(cls, us_size: str) -> Optional[str]:
        """Convert US shoe size to EU size."""
        return cls.US_TO_EU_SHOES.get(us_size)
    
    @classmethod
    def get_size_conversions(cls, size: str, size_type: SizeType) -> Dict[str, str]:
        """Get size conversions for different regions."""
        conversions = {"US": size}
        
        if size_type == SizeType.SHOES:
            eu_size = cls.us_to_eu_shoe_size(size)
            if eu_size:
                conversions["EU"] = eu_size
        
        return conversions
