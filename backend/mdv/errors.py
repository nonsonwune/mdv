"""
Standardized error handling and response formatting for MDV API.

This module provides consistent error response structures, user-friendly messages,
and proper error categorization across all API endpoints.
"""

from typing import Dict, Any, Optional, List, Union, Callable
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import uuid
import traceback
import logging
from contextlib import contextmanager

from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """Error categories for better error handling and monitoring."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    RATE_LIMIT = "rate_limit"
    INTERNAL = "internal"
    EXTERNAL = "external"
    BUSINESS_LOGIC = "business_logic"


class ErrorCode(Enum):
    """Standardized error codes for the MDV API."""
    # Authentication errors (1000-1099)
    INVALID_CREDENTIALS = "AUTH_1001"
    TOKEN_EXPIRED = "AUTH_1002"
    TOKEN_INVALID = "AUTH_1003"
    ACCOUNT_DISABLED = "AUTH_1004"
    PASSWORD_CHANGE_REQUIRED = "AUTH_1005"
    
    # Authorization errors (1100-1199)
    INSUFFICIENT_PERMISSIONS = "AUTHZ_1101"
    ROLE_NOT_ALLOWED = "AUTHZ_1102"
    RESOURCE_ACCESS_DENIED = "AUTHZ_1103"
    
    # Validation errors (1200-1299)
    INVALID_INPUT = "VAL_1201"
    MISSING_REQUIRED_FIELD = "VAL_1202"
    INVALID_FORMAT = "VAL_1203"
    VALUE_OUT_OF_RANGE = "VAL_1204"
    INVALID_EMAIL = "VAL_1205"
    INVALID_PHONE = "VAL_1206"
    
    # Resource errors (1300-1399)
    RESOURCE_NOT_FOUND = "RES_1301"
    USER_NOT_FOUND = "RES_1302"
    PRODUCT_NOT_FOUND = "RES_1303"
    ORDER_NOT_FOUND = "RES_1304"
    CATEGORY_NOT_FOUND = "RES_1305"
    
    # Conflict errors (1400-1499)
    RESOURCE_ALREADY_EXISTS = "CONF_1401"
    EMAIL_ALREADY_EXISTS = "CONF_1402"
    PRODUCT_SKU_EXISTS = "CONF_1403"
    CONCURRENT_MODIFICATION = "CONF_1404"
    
    # Business logic errors (1500-1599)
    INSUFFICIENT_INVENTORY = "BIZ_1501"
    ORDER_CANNOT_BE_CANCELLED = "BIZ_1502"
    PAYMENT_FAILED = "BIZ_1503"
    SHIPPING_NOT_AVAILABLE = "BIZ_1504"
    DISCOUNT_NOT_APPLICABLE = "BIZ_1505"
    
    # Rate limiting (1600-1699)
    RATE_LIMIT_EXCEEDED = "RATE_1601"
    TOO_MANY_REQUESTS = "RATE_1602"
    
    # Internal errors (1700-1799)
    INTERNAL_SERVER_ERROR = "INT_1701"
    DATABASE_ERROR = "INT_1702"
    EXTERNAL_SERVICE_ERROR = "INT_1703"
    CONFIGURATION_ERROR = "INT_1704"


@dataclass
class ErrorDetail:
    """Detailed error information."""
    field: Optional[str] = None
    message: str = ""
    code: Optional[str] = None


class APIError(Exception):
    """Base API error class with standardized error information."""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        category: ErrorCategory = ErrorCategory.VALIDATION,
        details: Optional[List[ErrorDetail]] = None,
        user_message: Optional[str] = None,
        internal_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.category = category
        self.details = details or []
        self.user_message = user_message or self._get_user_friendly_message()
        self.internal_message = internal_message
        self.metadata = metadata or {}
        self.error_id = str(uuid.uuid4())
        self.timestamp = datetime.now().isoformat()
        
        super().__init__(self.message)
    
    def _get_user_friendly_message(self) -> str:
        """Generate user-friendly error messages."""
        user_messages = {
            ErrorCode.INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
            ErrorCode.TOKEN_EXPIRED: "Your session has expired. Please log in again.",
            ErrorCode.TOKEN_INVALID: "Invalid session. Please log in again.",
            ErrorCode.ACCOUNT_DISABLED: "Your account has been disabled. Please contact support.",
            ErrorCode.PASSWORD_CHANGE_REQUIRED: "You must change your password before continuing.",
            
            ErrorCode.INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action.",
            ErrorCode.ROLE_NOT_ALLOWED: "Your account type doesn't allow this action.",
            ErrorCode.RESOURCE_ACCESS_DENIED: "Access to this resource is denied.",
            
            ErrorCode.INVALID_INPUT: "Please check your input and try again.",
            ErrorCode.MISSING_REQUIRED_FIELD: "Please fill in all required fields.",
            ErrorCode.INVALID_FORMAT: "Please check the format of your input.",
            ErrorCode.INVALID_EMAIL: "Please enter a valid email address.",
            ErrorCode.INVALID_PHONE: "Please enter a valid phone number.",
            
            ErrorCode.RESOURCE_NOT_FOUND: "The requested item was not found.",
            ErrorCode.USER_NOT_FOUND: "User not found.",
            ErrorCode.PRODUCT_NOT_FOUND: "Product not found.",
            ErrorCode.ORDER_NOT_FOUND: "Order not found.",
            ErrorCode.CATEGORY_NOT_FOUND: "Category not found.",
            
            ErrorCode.RESOURCE_ALREADY_EXISTS: "This item already exists.",
            ErrorCode.EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
            ErrorCode.PRODUCT_SKU_EXISTS: "A product with this SKU already exists.",
            
            ErrorCode.INSUFFICIENT_INVENTORY: "Not enough items in stock.",
            ErrorCode.ORDER_CANNOT_BE_CANCELLED: "This order cannot be cancelled.",
            ErrorCode.PAYMENT_FAILED: "Payment processing failed. Please try again.",
            ErrorCode.SHIPPING_NOT_AVAILABLE: "Shipping is not available to this location.",
            
            ErrorCode.RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",
            ErrorCode.TOO_MANY_REQUESTS: "You're making requests too quickly. Please slow down.",
            
            ErrorCode.INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again later.",
            ErrorCode.DATABASE_ERROR: "We're experiencing technical difficulties. Please try again later.",
            ErrorCode.EXTERNAL_SERVICE_ERROR: "External service is temporarily unavailable. Please try again later.",
        }
        
        return user_messages.get(self.error_code, "An error occurred. Please try again.")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for JSON response."""
        return {
            "error": {
                "code": self.error_code.value,
                "category": self.category.value,
                "message": self.user_message,
                "details": [
                    {
                        "field": detail.field,
                        "message": detail.message,
                        "code": detail.code
                    }
                    for detail in self.details
                ] if self.details else None,
                "error_id": self.error_id,
                "timestamp": self.timestamp,
                "metadata": self.metadata if self.metadata else None
            }
        }
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict()["error"]
        )


# Convenience functions for common errors
def authentication_error(message: str, error_code: ErrorCode = ErrorCode.INVALID_CREDENTIALS) -> APIError:
    """Create an authentication error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_401_UNAUTHORIZED,
        category=ErrorCategory.AUTHENTICATION
    )


def authorization_error(message: str, error_code: ErrorCode = ErrorCode.INSUFFICIENT_PERMISSIONS) -> APIError:
    """Create an authorization error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_403_FORBIDDEN,
        category=ErrorCategory.AUTHORIZATION
    )


def validation_error(message: str, details: List[ErrorDetail] = None, error_code: ErrorCode = ErrorCode.INVALID_INPUT) -> APIError:
    """Create a validation error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_400_BAD_REQUEST,
        category=ErrorCategory.VALIDATION,
        details=details
    )


def not_found_error(message: str, error_code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND) -> APIError:
    """Create a not found error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_404_NOT_FOUND,
        category=ErrorCategory.NOT_FOUND
    )


def conflict_error(message: str, error_code: ErrorCode = ErrorCode.RESOURCE_ALREADY_EXISTS) -> APIError:
    """Create a conflict error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_409_CONFLICT,
        category=ErrorCategory.CONFLICT
    )


def business_logic_error(message: str, error_code: ErrorCode, user_message: str = None) -> APIError:
    """Create a business logic error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        category=ErrorCategory.BUSINESS_LOGIC,
        user_message=user_message
    )


def internal_error(message: str, error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR) -> APIError:
    """Create an internal server error."""
    return APIError(
        message=message,
        error_code=error_code,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        category=ErrorCategory.INTERNAL
    )


def rate_limit_error(message: str = "Rate limit exceeded") -> APIError:
    """Create a rate limit error."""
    return APIError(
        message=message,
        error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        category=ErrorCategory.RATE_LIMIT
    )


def create_error_response(error: APIError) -> JSONResponse:
    """Create a standardized JSON error response."""
    return JSONResponse(
        status_code=error.status_code,
        content=error.to_dict()
    )


# Enhanced error handling utilities
class ErrorContext:
    """Context manager for enhanced error handling with automatic logging."""

    def __init__(
        self,
        operation: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        self.operation = operation
        self.user_id = user_id
        self.request_id = request_id
        self.additional_context = additional_context or {}
        self.start_time = datetime.now()

    def __enter__(self):
        logger.info(f"Starting operation: {self.operation}", extra={
            "operation": self.operation,
            "user_id": self.user_id,
            "request_id": self.request_id,
            **self.additional_context
        })
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()

        if exc_type is None:
            logger.info(f"Operation completed: {self.operation}", extra={
                "operation": self.operation,
                "duration_seconds": duration,
                "user_id": self.user_id,
                "request_id": self.request_id,
                **self.additional_context
            })
        else:
            logger.error(f"Operation failed: {self.operation}", extra={
                "operation": self.operation,
                "duration_seconds": duration,
                "user_id": self.user_id,
                "request_id": self.request_id,
                "error_type": exc_type.__name__,
                "error_message": str(exc_val),
                "traceback": traceback.format_exc(),
                **self.additional_context
            })

        return False  # Don't suppress exceptions


@contextmanager
def error_context(
    operation: str,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
    **kwargs
):
    """Context manager for error handling with automatic logging."""
    with ErrorContext(operation, user_id, request_id, kwargs):
        yield


def handle_database_error(e: Exception, operation: str = "database operation") -> APIError:
    """Convert database errors to standardized API errors."""
    error_message = str(e).lower()

    # Handle specific database errors
    if "unique constraint" in error_message or "duplicate key" in error_message:
        if "email" in error_message:
            return APIError(
                message="Email address already exists",
                error_code=ErrorCode.EMAIL_ALREADY_EXISTS,
                status_code=status.HTTP_409_CONFLICT,
                category=ErrorCategory.CONFLICT
            )
        else:
            return APIError(
                message="Resource already exists",
                error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
                status_code=status.HTTP_409_CONFLICT,
                category=ErrorCategory.CONFLICT
            )

    elif "foreign key constraint" in error_message:
        return APIError(
            message="Referenced resource not found",
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            category=ErrorCategory.NOT_FOUND
        )

    elif "check constraint" in error_message:
        return APIError(
            message="Invalid data provided",
            error_code=ErrorCode.INVALID_INPUT,
            status_code=status.HTTP_400_BAD_REQUEST,
            category=ErrorCategory.VALIDATION
        )

    elif "connection" in error_message or "timeout" in error_message:
        return APIError(
            message="Database connection error",
            error_code=ErrorCode.DATABASE_ERROR,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            category=ErrorCategory.INTERNAL,
            internal_message=f"Database error during {operation}: {str(e)}"
        )

    else:
        # Generic database error
        logger.error(f"Unhandled database error during {operation}: {str(e)}")
        return APIError(
            message="Database operation failed",
            error_code=ErrorCode.DATABASE_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            category=ErrorCategory.INTERNAL,
            internal_message=f"Database error during {operation}: {str(e)}"
        )


def handle_external_api_error(
    e: Exception,
    service_name: str,
    operation: str = "external API call"
) -> APIError:
    """Convert external API errors to standardized API errors."""
    error_message = str(e).lower()

    if "timeout" in error_message:
        return APIError(
            message=f"{service_name} service is temporarily unavailable",
            error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            category=ErrorCategory.EXTERNAL,
            metadata={"service": service_name, "error_type": "timeout"}
        )

    elif "connection" in error_message:
        return APIError(
            message=f"Unable to connect to {service_name} service",
            error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            category=ErrorCategory.EXTERNAL,
            metadata={"service": service_name, "error_type": "connection"}
        )

    else:
        logger.error(f"External API error ({service_name}) during {operation}: {str(e)}")
        return APIError(
            message=f"{service_name} service error",
            error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY,
            category=ErrorCategory.EXTERNAL,
            metadata={"service": service_name, "error_type": "unknown"},
            internal_message=f"External API error ({service_name}) during {operation}: {str(e)}"
        )


def safe_execute(
    func: Callable,
    *args,
    operation: str = "operation",
    fallback_value: Any = None,
    reraise: bool = True,
    **kwargs
) -> Any:
    """Safely execute a function with error handling and logging."""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Error during {operation}: {str(e)}", extra={
            "operation": operation,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        })

        if reraise:
            raise
        else:
            return fallback_value


class ErrorCollector:
    """Utility class to collect multiple errors before raising."""

    def __init__(self):
        self.errors: List[ErrorDetail] = []
        self.warnings: List[ErrorDetail] = []

    def add_error(self, field: str, message: str, code: str = "INVALID"):
        """Add an error to the collection."""
        self.errors.append(ErrorDetail(field=field, message=message, code=code))

    def add_warning(self, field: str, message: str, code: str = "WARNING"):
        """Add a warning to the collection."""
        self.warnings.append(ErrorDetail(field=field, message=message, code=code))

    def has_errors(self) -> bool:
        """Check if there are any errors."""
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        """Check if there are any warnings."""
        return len(self.warnings) > 0

    def raise_if_errors(self, message: str = "Validation failed"):
        """Raise an APIError if there are any errors."""
        if self.has_errors():
            raise validation_error(message, details=self.errors)

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of collected errors and warnings."""
        return {
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [error.__dict__ for error in self.errors],
            "warnings": [warning.__dict__ for warning in self.warnings]
        }


def create_error_handler(
    error_type: type,
    error_code: ErrorCode,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    message_template: str = "An error occurred: {error}"
) -> Callable:
    """Create a standardized error handler for specific exception types."""

    def handler(e: Exception) -> APIError:
        message = message_template.format(error=str(e))
        return APIError(
            message=message,
            error_code=error_code,
            status_code=status_code,
            category=category,
            internal_message=f"{error_type.__name__}: {str(e)}"
        )

    return handler


# Pre-configured error handlers
database_error_handler = create_error_handler(
    Exception,
    ErrorCode.DATABASE_ERROR,
    status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCategory.INTERNAL,
    "Database operation failed"
)

external_service_error_handler = create_error_handler(
    Exception,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCategory.EXTERNAL,
    "External service unavailable"
)

validation_error_handler = create_error_handler(
    ValueError,
    ErrorCode.INVALID_INPUT,
    status.HTTP_400_BAD_REQUEST,
    ErrorCategory.VALIDATION,
    "Invalid input: {error}"
)
