"""
Global exception handling middleware for comprehensive error management.
"""

import logging
import traceback
import time
from typing import Callable, Any, Dict, Optional
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from pydantic import ValidationError
import httpx

from .errors import (
    APIError, ErrorCode, ErrorCategory, create_error_response,
    handle_database_error, handle_external_api_error, ErrorCollector
)
from .response_middleware import get_request_id

logger = logging.getLogger(__name__)


class GlobalExceptionMiddleware(BaseHTTPMiddleware):
    """
    Global exception handling middleware that catches and standardizes
    all unhandled exceptions across the application.
    """
    
    def __init__(self, app, debug: bool = False):
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Handle request and catch any unhandled exceptions."""
        start_time = time.time()
        request_id = get_request_id(request)
        
        try:
            response = await call_next(request)
            return response
            
        except APIError as e:
            # APIError is already properly formatted
            logger.warning(f"API Error: {e.message}", extra={
                "error_code": e.error_code.value,
                "status_code": e.status_code,
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            })
            return create_error_response(e)
            
        except ValidationError as e:
            # Pydantic validation errors
            logger.warning(f"Validation Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "errors": e.errors()
            })
            
            api_error = self._handle_validation_error(e, request_id)
            return create_error_response(api_error)
            
        except SQLAlchemyError as e:
            # Database errors
            logger.error(f"Database Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_type": type(e).__name__
            })
            
            api_error = handle_database_error(e, f"{request.method} {request.url.path}")
            api_error.metadata["request_id"] = request_id
            return create_error_response(api_error)
            
        except httpx.HTTPError as e:
            # External HTTP service errors
            logger.error(f"External HTTP Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_type": type(e).__name__
            })
            
            api_error = handle_external_api_error(e, "external service", f"{request.method} {request.url.path}")
            api_error.metadata["request_id"] = request_id
            return create_error_response(api_error)
            
        except PermissionError as e:
            # Permission/authorization errors
            logger.warning(f"Permission Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            })
            
            api_error = APIError(
                message="Insufficient permissions",
                error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
                status_code=status.HTTP_403_FORBIDDEN,
                category=ErrorCategory.AUTHORIZATION,
                metadata={"request_id": request_id}
            )
            return create_error_response(api_error)
            
        except ValueError as e:
            # Value errors (often from business logic)
            logger.warning(f"Value Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            })
            
            api_error = APIError(
                message=str(e),
                error_code=ErrorCode.INVALID_INPUT,
                status_code=status.HTTP_400_BAD_REQUEST,
                category=ErrorCategory.VALIDATION,
                metadata={"request_id": request_id}
            )
            return create_error_response(api_error)
            
        except FileNotFoundError as e:
            # File not found errors
            logger.warning(f"File Not Found: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            })
            
            api_error = APIError(
                message="Requested file not found",
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
                category=ErrorCategory.NOT_FOUND,
                metadata={"request_id": request_id}
            )
            return create_error_response(api_error)
            
        except TimeoutError as e:
            # Timeout errors
            logger.error(f"Timeout Error: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            })
            
            api_error = APIError(
                message="Request timeout",
                error_code=ErrorCode.REQUEST_TIMEOUT,
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                category=ErrorCategory.INTERNAL,
                metadata={"request_id": request_id}
            )
            return create_error_response(api_error)
            
        except Exception as e:
            # Catch-all for unexpected errors
            processing_time = (time.time() - start_time) * 1000
            
            logger.error(f"Unhandled Exception: {str(e)}", extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_type": type(e).__name__,
                "processing_time_ms": processing_time,
                "traceback": traceback.format_exc() if self.debug else None
            })
            
            # Create generic internal server error
            api_error = APIError(
                message="An unexpected error occurred",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                category=ErrorCategory.INTERNAL,
                metadata={
                    "request_id": request_id,
                    "processing_time_ms": processing_time
                },
                internal_message=f"Unhandled exception: {str(e)}"
            )
            
            # Include traceback in debug mode
            if self.debug:
                api_error.metadata["traceback"] = traceback.format_exc()
            
            return create_error_response(api_error)
    
    def _handle_validation_error(self, e: ValidationError, request_id: str) -> APIError:
        """Convert Pydantic validation error to APIError."""
        from .errors import ErrorDetail
        
        details = []
        for error in e.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            error_type = error["type"]
            
            details.append(ErrorDetail(
                field=field,
                message=message,
                code=error_type.upper()
            ))
        
        return APIError(
            message="Validation failed",
            error_code=ErrorCode.INVALID_INPUT,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            category=ErrorCategory.VALIDATION,
            details=details,
            metadata={"request_id": request_id}
        )


class ErrorReportingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for error reporting and metrics collection.
    """
    
    def __init__(self, app, enable_metrics: bool = True):
        super().__init__(app)
        self.enable_metrics = enable_metrics
        self.error_counts: Dict[str, int] = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Track error metrics and report critical errors."""
        try:
            response = await call_next(request)
            
            # Track error responses
            if self.enable_metrics and response.status_code >= 400:
                error_key = f"{response.status_code}_{request.url.path}"
                self.error_counts[error_key] = self.error_counts.get(error_key, 0) + 1
                
                # Log high error rates
                if self.error_counts[error_key] % 10 == 0:
                    logger.warning(f"High error rate detected: {error_key} occurred {self.error_counts[error_key]} times")
            
            return response
            
        except Exception as e:
            # This middleware should not interfere with error handling
            logger.error(f"Error in ErrorReportingMiddleware: {str(e)}")
            raise
    
    def get_error_metrics(self) -> Dict[str, Any]:
        """Get current error metrics."""
        return {
            "error_counts": self.error_counts.copy(),
            "total_errors": sum(self.error_counts.values()),
            "unique_error_types": len(self.error_counts)
        }
    
    def reset_metrics(self):
        """Reset error metrics."""
        self.error_counts.clear()


# Utility functions for error handling
def log_error_context(
    error: Exception,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    additional_context: Optional[Dict[str, Any]] = None
):
    """Log error with comprehensive context information."""
    context = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc()
    }
    
    if request:
        context.update({
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_ip": request.client.host if request.client else None
        })
    
    if user_id:
        context["user_id"] = user_id
    
    if additional_context:
        context.update(additional_context)
    
    logger.error(f"Error occurred: {str(error)}", extra=context)


def create_error_summary(errors: list) -> Dict[str, Any]:
    """Create a summary of multiple errors for reporting."""
    error_types = {}
    for error in errors:
        error_type = type(error).__name__
        error_types[error_type] = error_types.get(error_type, 0) + 1
    
    return {
        "total_errors": len(errors),
        "error_types": error_types,
        "first_error": str(errors[0]) if errors else None,
        "timestamp": time.time()
    }
