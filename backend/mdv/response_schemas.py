"""
Standardized API response schemas for consistent response formatting
across all MDV API endpoints.
"""

from typing import Any, Dict, List, Optional, Generic, TypeVar, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

T = TypeVar('T')


class ResponseStatus(str, Enum):
    """Standard response status values."""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class MetaData(BaseModel):
    """Metadata for API responses."""
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = None
    version: str = "1.0"
    environment: Optional[str] = None
    processing_time_ms: Optional[float] = None


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Number of items per page")
    total_items: int = Field(ge=0, description="Total number of items")
    total_pages: int = Field(ge=0, description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_previous: bool = Field(description="Whether there is a previous page")
    next_page: Optional[int] = Field(None, description="Next page number if available")
    previous_page: Optional[int] = Field(None, description="Previous page number if available")


class ErrorDetail(BaseModel):
    """Detailed error information."""
    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    location: Optional[str] = Field(None, description="Location of the error (body, query, path)")


class ErrorResponse(BaseModel):
    """Standardized error response format."""
    status: ResponseStatus = ResponseStatus.ERROR
    error: Dict[str, Any] = Field(description="Error information")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        code: str,
        message: str,
        details: Optional[List[ErrorDetail]] = None,
        category: str = "validation",
        status_code: int = 400,
        metadata: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> "ErrorResponse":
        """Create a standardized error response."""
        error_data = {
            "code": code,
            "message": message,
            "category": category,
            "status_code": status_code,
            "details": [detail.dict() for detail in (details or [])],
            "timestamp": datetime.now().isoformat()
        }
        
        if metadata:
            error_data["metadata"] = metadata
            
        meta = MetaData(request_id=request_id)
        
        return cls(error=error_data, meta=meta)


class SuccessResponse(BaseModel, Generic[T]):
    """Standardized success response format."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: T = Field(description="Response data")
    message: Optional[str] = Field(None, description="Optional success message")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        data: T,
        message: Optional[str] = None,
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "SuccessResponse[T]":
        """Create a standardized success response."""
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        return cls(data=data, message=message, meta=meta)


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated response format."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: List[T] = Field(description="List of items")
    pagination: PaginationMeta = Field(description="Pagination metadata")
    message: Optional[str] = Field(None, description="Optional message")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        items: List[T],
        page: int,
        page_size: int,
        total_items: int,
        message: Optional[str] = None,
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "PaginatedResponse[T]":
        """Create a standardized paginated response."""
        total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
        has_next = page < total_pages
        has_previous = page > 1
        next_page = page + 1 if has_next else None
        previous_page = page - 1 if has_previous else None
        
        pagination = PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=has_next,
            has_previous=has_previous,
            next_page=next_page,
            previous_page=previous_page
        )
        
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        return cls(
            data=items,
            pagination=pagination,
            message=message,
            meta=meta
        )


class ListResponse(BaseModel, Generic[T]):
    """Standardized list response format (non-paginated)."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: List[T] = Field(description="List of items")
    count: int = Field(ge=0, description="Number of items in the list")
    message: Optional[str] = Field(None, description="Optional message")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        items: List[T],
        message: Optional[str] = None,
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "ListResponse[T]":
        """Create a standardized list response."""
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        return cls(
            data=items,
            count=len(items),
            message=message,
            meta=meta
        )


class CreatedResponse(BaseModel, Generic[T]):
    """Standardized response for resource creation."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: T = Field(description="Created resource data")
    message: str = Field(default="Resource created successfully")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        data: T,
        message: str = "Resource created successfully",
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "CreatedResponse[T]":
        """Create a standardized creation response."""
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        return cls(data=data, message=message, meta=meta)


class UpdatedResponse(BaseModel, Generic[T]):
    """Standardized response for resource updates."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: T = Field(description="Updated resource data")
    message: str = Field(default="Resource updated successfully")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        data: T,
        message: str = "Resource updated successfully",
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "UpdatedResponse[T]":
        """Create a standardized update response."""
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        return cls(data=data, message=message, meta=meta)


class DeletedResponse(BaseModel):
    """Standardized response for resource deletion."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Dict[str, Any] = Field(description="Deletion confirmation data")
    message: str = Field(default="Resource deleted successfully")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        resource_id: Union[int, str],
        resource_type: str = "resource",
        message: Optional[str] = None,
        request_id: Optional[str] = None,
        processing_time_ms: Optional[float] = None
    ) -> "DeletedResponse":
        """Create a standardized deletion response."""
        data = {
            "id": resource_id,
            "type": resource_type,
            "deleted_at": datetime.now().isoformat()
        }
        
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms
        )
        
        final_message = message or f"{resource_type.title()} deleted successfully"
        
        return cls(data=data, message=final_message, meta=meta)


class HealthResponse(BaseModel):
    """Standardized health check response."""
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Dict[str, Any] = Field(description="Health check data")
    meta: MetaData = Field(default_factory=MetaData)
    
    @classmethod
    def create(
        cls,
        service_name: str = "mdv-api",
        version: str = "1.0.0",
        environment: Optional[str] = None,
        checks: Optional[Dict[str, Any]] = None,
        uptime_seconds: Optional[float] = None
    ) -> "HealthResponse":
        """Create a standardized health response."""
        data = {
            "service": service_name,
            "version": version,
            "timestamp": datetime.now().isoformat(),
            "healthy": True
        }
        
        if environment:
            data["environment"] = environment
            
        if uptime_seconds is not None:
            data["uptime_seconds"] = uptime_seconds
            
        if checks:
            data["checks"] = checks
            
        meta = MetaData(environment=environment)
        
        return cls(data=data, meta=meta)


# Convenience type aliases for common response patterns
ApiResponse = Union[SuccessResponse[Any], ErrorResponse]
ApiListResponse = Union[ListResponse[Any], PaginatedResponse[Any], ErrorResponse]
ApiCrudResponse = Union[
    SuccessResponse[Any],
    CreatedResponse[Any],
    UpdatedResponse[Any],
    DeletedResponse,
    ErrorResponse
]


# Response utility functions
def success(
    data: Any,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> SuccessResponse[Any]:
    """Create a success response."""
    return SuccessResponse.create(
        data=data,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def created(
    data: Any,
    message: str = "Resource created successfully",
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> CreatedResponse[Any]:
    """Create a creation response."""
    return CreatedResponse.create(
        data=data,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def updated(
    data: Any,
    message: str = "Resource updated successfully",
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> UpdatedResponse[Any]:
    """Create an update response."""
    return UpdatedResponse.create(
        data=data,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def deleted(
    resource_id: Union[int, str],
    resource_type: str = "resource",
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> DeletedResponse:
    """Create a deletion response."""
    return DeletedResponse.create(
        resource_id=resource_id,
        resource_type=resource_type,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def paginated(
    items: List[Any],
    page: int,
    page_size: int,
    total_items: int,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> PaginatedResponse[Any]:
    """Create a paginated response."""
    return PaginatedResponse.create(
        items=items,
        page=page,
        page_size=page_size,
        total_items=total_items,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def list_response(
    items: List[Any],
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    processing_time_ms: Optional[float] = None
) -> ListResponse[Any]:
    """Create a list response."""
    return ListResponse.create(
        items=items,
        message=message,
        request_id=request_id,
        processing_time_ms=processing_time_ms
    )


def error(
    code: str,
    message: str,
    details: Optional[List[ErrorDetail]] = None,
    category: str = "validation",
    status_code: int = 400,
    metadata: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> ErrorResponse:
    """Create an error response."""
    return ErrorResponse.create(
        code=code,
        message=message,
        details=details,
        category=category,
        status_code=status_code,
        metadata=metadata,
        request_id=request_id
    )


def health(
    service_name: str = "mdv-api",
    version: str = "1.0.0",
    environment: Optional[str] = None,
    checks: Optional[Dict[str, Any]] = None,
    uptime_seconds: Optional[float] = None
) -> HealthResponse:
    """Create a health response."""
    return HealthResponse.create(
        service_name=service_name,
        version=version,
        environment=environment,
        checks=checks,
        uptime_seconds=uptime_seconds
    )
