"""
Enhanced input validation utilities and custom validators for MDV API.
"""

import re
import phonenumbers
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from pydantic import BaseModel, Field, validator, root_validator
from pydantic.validators import str_validator
from email_validator import validate_email, EmailNotValidError


class ValidationError(Exception):
    """Custom validation error with detailed information."""
    
    def __init__(self, field: str, message: str, code: str = "INVALID"):
        self.field = field
        self.message = message
        self.code = code
        super().__init__(f"{field}: {message}")


class ValidationResult:
    """Result of validation with errors and warnings."""
    
    def __init__(self):
        self.errors: List[Dict[str, str]] = []
        self.warnings: List[Dict[str, str]] = []
        self.is_valid = True
    
    def add_error(self, field: str, message: str, code: str = "INVALID"):
        """Add a validation error."""
        self.errors.append({
            "field": field,
            "message": message,
            "code": code
        })
        self.is_valid = False
    
    def add_warning(self, field: str, message: str, code: str = "WARNING"):
        """Add a validation warning."""
        self.warnings.append({
            "field": field,
            "message": message,
            "code": code
        })


# Custom validator functions
def validate_nigerian_phone(phone: str) -> str:
    """Validate Nigerian phone number format."""
    if not phone:
        raise ValueError("Phone number is required")
    
    # Remove all non-digit characters
    cleaned = re.sub(r'\D', '', phone)
    
    # Check if it's a valid Nigerian number
    try:
        parsed = phonenumbers.parse(cleaned, "NG")
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Invalid Nigerian phone number")
        
        # Format as international number
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    
    except phonenumbers.NumberParseException:
        # Try with +234 prefix if not present
        if not cleaned.startswith("234"):
            if cleaned.startswith("0"):
                cleaned = "234" + cleaned[1:]
            else:
                cleaned = "234" + cleaned
        
        try:
            parsed = phonenumbers.parse("+" + cleaned, None)
            if not phonenumbers.is_valid_number(parsed):
                raise ValueError("Invalid Nigerian phone number")
            
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        
        except phonenumbers.NumberParseException:
            raise ValueError("Invalid phone number format")


def validate_email_address(email: str) -> str:
    """Enhanced email validation."""
    if not email:
        raise ValueError("Email address is required")
    
    try:
        # Use email-validator for comprehensive validation
        validated_email = validate_email(email)
        return validated_email.email.lower()
    
    except EmailNotValidError as e:
        raise ValueError(f"Invalid email address: {str(e)}")


def validate_password_strength(password: str) -> str:
    """Validate password strength according to security requirements."""
    if not password:
        raise ValueError("Password is required")
    
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if len(password) > 128:
        raise ValueError("Password must not exceed 128 characters")
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Password must contain at least one special character")
    
    # Check for common weak passwords
    weak_patterns = [
        r'password',
        r'123456',
        r'qwerty',
        r'admin',
        r'letmein'
    ]
    
    for pattern in weak_patterns:
        if re.search(pattern, password.lower()):
            raise ValueError("Password is too common and easily guessable")
    
    return password


def validate_nigerian_state(state: str) -> str:
    """Validate Nigerian state name."""
    nigerian_states = {
        "abia", "adamawa", "akwa ibom", "anambra", "bauchi", "bayelsa", "benue",
        "borno", "cross river", "delta", "ebonyi", "edo", "ekiti", "enugu",
        "gombe", "imo", "jigawa", "kaduna", "kano", "katsina", "kebbi", "kogi",
        "kwara", "lagos", "nasarawa", "niger", "ogun", "ondo", "osun", "oyo",
        "plateau", "rivers", "sokoto", "taraba", "yobe", "zamfara", "fct"
    }
    
    if not state:
        raise ValueError("State is required")
    
    state_lower = state.lower().strip()
    if state_lower not in nigerian_states:
        raise ValueError(f"Invalid Nigerian state: {state}")
    
    return state.title()


def validate_price(price: Union[str, float, Decimal]) -> Decimal:
    """Validate and normalize price values."""
    if price is None:
        raise ValueError("Price is required")
    
    try:
        decimal_price = Decimal(str(price))
    except (InvalidOperation, ValueError):
        raise ValueError("Invalid price format")
    
    if decimal_price < 0:
        raise ValueError("Price cannot be negative")
    
    if decimal_price > Decimal('999999.99'):
        raise ValueError("Price exceeds maximum allowed value")
    
    # Round to 2 decimal places
    return decimal_price.quantize(Decimal('0.01'))


def validate_sku(sku: str) -> str:
    """Validate product SKU format."""
    if not sku:
        raise ValueError("SKU is required")
    
    # SKU should be alphanumeric with hyphens and underscores allowed
    if not re.match(r'^[A-Za-z0-9_-]+$', sku):
        raise ValueError("SKU can only contain letters, numbers, hyphens, and underscores")
    
    if len(sku) < 3:
        raise ValueError("SKU must be at least 3 characters long")
    
    if len(sku) > 50:
        raise ValueError("SKU must not exceed 50 characters")
    
    return sku.upper()


def validate_slug(slug: str) -> str:
    """Validate URL slug format."""
    if not slug:
        raise ValueError("Slug is required")
    
    # Slug should be lowercase with hyphens
    if not re.match(r'^[a-z0-9-]+$', slug):
        raise ValueError("Slug can only contain lowercase letters, numbers, and hyphens")
    
    if slug.startswith('-') or slug.endswith('-'):
        raise ValueError("Slug cannot start or end with a hyphen")
    
    if '--' in slug:
        raise ValueError("Slug cannot contain consecutive hyphens")
    
    if len(slug) < 3:
        raise ValueError("Slug must be at least 3 characters long")
    
    if len(slug) > 100:
        raise ValueError("Slug must not exceed 100 characters")
    
    return slug


def validate_quantity(quantity: Union[str, int]) -> int:
    """Validate quantity values."""
    try:
        qty = int(quantity)
    except (ValueError, TypeError):
        raise ValueError("Quantity must be a valid integer")
    
    if qty < 0:
        raise ValueError("Quantity cannot be negative")
    
    if qty > 999999:
        raise ValueError("Quantity exceeds maximum allowed value")
    
    return qty


def validate_percentage(percentage: Union[str, float]) -> float:
    """Validate percentage values (0-100)."""
    try:
        pct = float(percentage)
    except (ValueError, TypeError):
        raise ValueError("Percentage must be a valid number")
    
    if pct < 0:
        raise ValueError("Percentage cannot be negative")
    
    if pct > 100:
        raise ValueError("Percentage cannot exceed 100")
    
    return round(pct, 2)


def validate_color_hex(color: str) -> str:
    """Validate hex color code."""
    if not color:
        raise ValueError("Color is required")
    
    # Remove # if present
    color = color.lstrip('#')
    
    # Check if it's a valid hex color (3 or 6 characters)
    if not re.match(r'^[A-Fa-f0-9]{3}$|^[A-Fa-f0-9]{6}$', color):
        raise ValueError("Invalid hex color format")
    
    # Convert 3-character hex to 6-character
    if len(color) == 3:
        color = ''.join([c*2 for c in color])
    
    return f"#{color.upper()}"


def validate_image_url(url: str) -> str:
    """Validate image URL format and extension."""
    if not url:
        raise ValueError("Image URL is required")
    
    # Basic URL format validation
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(url):
        raise ValueError("Invalid URL format")
    
    # Check for image file extensions
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    if not any(url.lower().endswith(ext) for ext in image_extensions):
        raise ValueError("URL must point to an image file")
    
    return url


# Pydantic custom validators
class EmailStr(str):
    """Custom email string type with validation."""
    
    @classmethod
    def __get_validators__(cls):
        yield str_validator
        yield cls.validate
    
    @classmethod
    def validate(cls, v: str) -> str:
        return validate_email_address(v)


class PhoneStr(str):
    """Custom phone string type with validation."""
    
    @classmethod
    def __get_validators__(cls):
        yield str_validator
        yield cls.validate
    
    @classmethod
    def validate(cls, v: str) -> str:
        return validate_nigerian_phone(v)


class PasswordStr(str):
    """Custom password string type with validation."""
    
    @classmethod
    def __get_validators__(cls):
        yield str_validator
        yield cls.validate
    
    @classmethod
    def validate(cls, v: str) -> str:
        return validate_password_strength(v)


class SKUStr(str):
    """Custom SKU string type with validation."""
    
    @classmethod
    def __get_validators__(cls):
        yield str_validator
        yield cls.validate
    
    @classmethod
    def validate(cls, v: str) -> str:
        return validate_sku(v)


class SlugStr(str):
    """Custom slug string type with validation."""

    @classmethod
    def __get_validators__(cls):
        yield str_validator
        yield cls.validate

    @classmethod
    def validate(cls, v: str) -> str:
        return validate_slug(v)


# Validation decorators and utilities
def validate_request_data(
    validator_func: Callable[[Any], ValidationResult]
) -> Callable:
    """Decorator to validate request data using a custom validator function."""

    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs):
            # Extract request data from function arguments
            request_data = None
            for arg in args:
                if hasattr(arg, '__dict__') and not hasattr(arg, 'method'):
                    # This is likely a Pydantic model (request body)
                    request_data = arg
                    break

            if request_data:
                # Run custom validation
                result = validator_func(request_data)
                if not result.is_valid:
                    from .errors import validation_error
                    raise validation_error(
                        "Validation failed",
                        details=[
                            {"field": error["field"], "message": error["message"], "code": error["code"]}
                            for error in result.errors
                        ]
                    )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """Sanitize string input by removing dangerous characters."""
    if not value:
        return value

    # Remove null bytes and control characters
    sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)

    # Trim whitespace
    sanitized = sanitized.strip()

    # Truncate if max_length is specified
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized


def validate_file_upload(
    file_data: bytes,
    allowed_types: List[str],
    max_size_mb: int = 10
) -> ValidationResult:
    """Validate file upload data."""
    result = ValidationResult()

    # Check file size
    file_size_mb = len(file_data) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        result.add_error(
            "file",
            f"File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb}MB)",
            "FILE_TOO_LARGE"
        )

    # Check file type by magic bytes
    file_signatures = {
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89\x50\x4e\x47'],
        'image/gif': [b'\x47\x49\x46\x38'],
        'image/webp': [b'\x52\x49\x46\x46'],
        'application/pdf': [b'\x25\x50\x44\x46'],
        'text/csv': [b'\xef\xbb\xbf', b''],  # CSV can start with BOM or any text
    }

    detected_type = None
    for mime_type, signatures in file_signatures.items():
        for signature in signatures:
            if file_data.startswith(signature):
                detected_type = mime_type
                break
        if detected_type:
            break

    if detected_type not in allowed_types:
        result.add_error(
            "file",
            f"File type not allowed. Detected: {detected_type}, Allowed: {', '.join(allowed_types)}",
            "INVALID_FILE_TYPE"
        )

    return result


def validate_bulk_operation(
    items: List[Any],
    max_items: int = 100,
    validator_func: Optional[Callable] = None
) -> ValidationResult:
    """Validate bulk operation data."""
    result = ValidationResult()

    # Check item count
    if len(items) > max_items:
        result.add_error(
            "items",
            f"Too many items ({len(items)}). Maximum allowed: {max_items}",
            "TOO_MANY_ITEMS"
        )

    if len(items) == 0:
        result.add_error(
            "items",
            "At least one item is required",
            "NO_ITEMS"
        )

    # Validate individual items if validator provided
    if validator_func:
        for i, item in enumerate(items):
            try:
                validator_func(item)
            except Exception as e:
                result.add_error(
                    f"items[{i}]",
                    str(e),
                    "INVALID_ITEM"
                )

    return result


# Common validation schemas
class PaginationParams(BaseModel):
    """Standard pagination parameters."""
    page: int = Field(1, ge=1, le=1000, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")

    @validator('page_size')
    def validate_page_size(cls, v):
        if v > 100:
            raise ValueError("Page size cannot exceed 100 items")
        return v


class SortParams(BaseModel):
    """Standard sorting parameters."""
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field("asc", regex="^(asc|desc)$", description="Sort order")

    @validator('sort_by')
    def validate_sort_by(cls, v):
        if v:
            # Only allow alphanumeric characters and underscores
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', v):
                raise ValueError("Invalid sort field name")
        return v


class SearchParams(BaseModel):
    """Standard search parameters."""
    q: Optional[str] = Field(None, max_length=200, description="Search query")

    @validator('q')
    def validate_search_query(cls, v):
        if v:
            # Sanitize search query
            v = sanitize_string(v, 200)
            # Minimum search length
            if len(v.strip()) < 2:
                raise ValueError("Search query must be at least 2 characters long")
        return v


class DateRangeParams(BaseModel):
    """Standard date range parameters."""
    start_date: Optional[date] = Field(None, description="Start date")
    end_date: Optional[date] = Field(None, description="End date")

    @root_validator
    def validate_date_range(cls, values):
        start_date = values.get('start_date')
        end_date = values.get('end_date')

        if start_date and end_date:
            if start_date > end_date:
                raise ValueError("Start date cannot be after end date")

            # Limit date range to prevent performance issues
            if (end_date - start_date).days > 365:
                raise ValueError("Date range cannot exceed 365 days")

        return values
