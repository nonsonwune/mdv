"""
Response middleware for standardizing API responses and adding metadata.
"""

import time
import uuid
from typing import Callable, Any, Dict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
import logging

from .config import settings

logger = logging.getLogger(__name__)


class ResponseStandardizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to standardize API responses by adding metadata,
    request IDs, and processing times.
    """
    
    def __init__(self, app, add_request_id: bool = True, add_timing: bool = True):
        super().__init__(app)
        self.add_request_id = add_request_id
        self.add_timing = add_timing
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and standardize response."""
        start_time = time.time()
        
        # Generate request ID if not present
        request_id = request.headers.get("X-Request-ID")
        if not request_id and self.add_request_id:
            request_id = str(uuid.uuid4())
        
        # Store request ID in request state for access in endpoints
        if request_id:
            request.state.request_id = request_id
        
        # Store start time for processing time calculation
        request.state.start_time = start_time
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Add headers
        if request_id:
            response.headers["X-Request-ID"] = request_id
        
        if self.add_timing:
            response.headers["X-Processing-Time-MS"] = f"{processing_time_ms:.2f}"
        
        # Add environment header in non-production
        if settings.env != "production":
            response.headers["X-Environment"] = settings.env
        
        # Enhance JSON responses with metadata
        if isinstance(response, JSONResponse):
            response = await self._enhance_json_response(
                response, request_id, processing_time_ms
            )
        
        return response
    
    async def _enhance_json_response(
        self, 
        response: JSONResponse, 
        request_id: str, 
        processing_time_ms: float
    ) -> JSONResponse:
        """Enhance JSON response with standardized metadata."""
        try:
            # Get the response content
            content = response.body.decode('utf-8')
            data = json.loads(content)
            
            # Skip enhancement if response already has standardized format
            if isinstance(data, dict) and 'meta' in data:
                # Update existing meta with timing info
                if 'meta' in data and isinstance(data['meta'], dict):
                    data['meta']['processing_time_ms'] = processing_time_ms
                    if request_id:
                        data['meta']['request_id'] = request_id
                
                # Create new response with updated content
                return JSONResponse(
                    content=data,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
            
            # For legacy responses, wrap in standardized format if needed
            if self._should_standardize_response(data):
                standardized_data = self._standardize_legacy_response(
                    data, request_id, processing_time_ms, response.status_code
                )
                
                return JSONResponse(
                    content=standardized_data,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
            
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"Failed to parse response JSON: {e}")
        except Exception as e:
            logger.error(f"Error enhancing JSON response: {e}")
        
        return response
    
    def _should_standardize_response(self, data: Any) -> bool:
        """Determine if response should be standardized."""
        # Don't standardize if already in standard format
        if isinstance(data, dict) and any(key in data for key in ['status', 'meta', 'error']):
            return False
        
        # Don't standardize simple health checks
        if isinstance(data, dict) and set(data.keys()) == {'status', 'service', 'version'}:
            return False
        
        # Don't standardize error responses that are already formatted
        if isinstance(data, dict) and 'detail' in data:
            return False
        
        return True
    
    def _standardize_legacy_response(
        self, 
        data: Any, 
        request_id: str, 
        processing_time_ms: float,
        status_code: int
    ) -> Dict[str, Any]:
        """Convert legacy response to standardized format."""
        from .response_schemas import ResponseStatus, MetaData
        
        # Determine response status
        if status_code >= 400:
            response_status = ResponseStatus.ERROR
        elif status_code >= 300:
            response_status = ResponseStatus.WARNING
        else:
            response_status = ResponseStatus.SUCCESS
        
        # Create metadata
        meta = MetaData(
            request_id=request_id,
            processing_time_ms=processing_time_ms,
            environment=settings.env if settings.env != "production" else None
        )
        
        # Handle different data types
        if isinstance(data, list):
            # List response
            return {
                "status": response_status,
                "data": data,
                "count": len(data),
                "meta": meta.dict()
            }
        elif isinstance(data, dict):
            # Check if it's a paginated response
            if all(key in data for key in ['items', 'total', 'page']):
                # Paginated response
                items = data.pop('items')
                pagination_info = data
                
                return {
                    "status": response_status,
                    "data": items,
                    "pagination": pagination_info,
                    "meta": meta.dict()
                }
            else:
                # Single object response
                return {
                    "status": response_status,
                    "data": data,
                    "meta": meta.dict()
                }
        else:
            # Primitive response
            return {
                "status": response_status,
                "data": data,
                "meta": meta.dict()
            }


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request context information for logging and tracing.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add request context."""
        # Extract useful request information
        request.state.client_ip = self._get_client_ip(request)
        request.state.user_agent = request.headers.get("user-agent", "")
        request.state.origin = request.headers.get("origin", "")
        request.state.referer = request.headers.get("referer", "")
        
        # Process request
        response = await call_next(request)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers (for load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"


def get_request_id(request: Request) -> str:
    """Get request ID from request state."""
    return getattr(request.state, 'request_id', 'unknown')


def get_processing_time(request: Request) -> float:
    """Get processing time from request state."""
    start_time = getattr(request.state, 'start_time', None)
    if start_time:
        return (time.time() - start_time) * 1000
    return 0.0


def get_client_info(request: Request) -> Dict[str, str]:
    """Get client information from request state."""
    return {
        "ip": getattr(request.state, 'client_ip', 'unknown'),
        "user_agent": getattr(request.state, 'user_agent', ''),
        "origin": getattr(request.state, 'origin', ''),
        "referer": getattr(request.state, 'referer', '')
    }
