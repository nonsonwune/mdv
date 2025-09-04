#!/usr/bin/env python3
"""
Comprehensive deployment health validation script for MDV platform.
Validates both frontend and backend services with detailed health checks.
"""

import asyncio
import json
import time
import sys
import argparse
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import aiohttp
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('deployment-validation.log')
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class HealthCheckResult:
    """Result of a health check."""
    service: str
    endpoint: str
    status: str  # 'healthy', 'degraded', 'unhealthy', 'error'
    response_time_ms: float
    status_code: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc).isoformat()


@dataclass
class ValidationReport:
    """Complete validation report."""
    overall_status: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    degraded_checks: int
    validation_time_ms: float
    results: List[HealthCheckResult]
    summary: Dict[str, Any]
    timestamp: str

    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total_checks == 0:
            return 0.0
        return (self.passed_checks / self.total_checks) * 100


class DeploymentValidator:
    """Main deployment validation class."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.results: List[HealthCheckResult] = []
        
    async def __aenter__(self):
        """Async context manager entry."""
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def validate_endpoint(
        self, 
        service: str, 
        endpoint: str, 
        expected_status: int = 200,
        timeout: float = 10.0,
        headers: Optional[Dict[str, str]] = None
    ) -> HealthCheckResult:
        """Validate a single endpoint."""
        start_time = time.time()
        
        try:
            async with self.session.get(
                endpoint, 
                headers=headers or {},
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_time = (time.time() - start_time) * 1000
                response_data = None
                
                try:
                    response_data = await response.json()
                except:
                    response_data = {"text": await response.text()}
                
                # Determine health status
                if response.status == expected_status:
                    status = "healthy"
                elif 200 <= response.status < 300:
                    status = "degraded"
                else:
                    status = "unhealthy"
                
                return HealthCheckResult(
                    service=service,
                    endpoint=endpoint,
                    status=status,
                    response_time_ms=response_time,
                    status_code=response.status,
                    details=response_data
                )
                
        except asyncio.TimeoutError:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                service=service,
                endpoint=endpoint,
                status="error",
                response_time_ms=response_time,
                error="Request timeout"
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                service=service,
                endpoint=endpoint,
                status="error",
                response_time_ms=response_time,
                error=str(e)
            )
    
    async def validate_api_health(self, base_url: str) -> List[HealthCheckResult]:
        """Validate API service health."""
        results = []
        
        # Basic health check
        result = await self.validate_endpoint("api", f"{base_url}/health")
        results.append(result)
        
        # Detailed health check
        result = await self.validate_endpoint("api", f"{base_url}/health/detailed", timeout=15.0)
        results.append(result)
        
        # Readiness check
        result = await self.validate_endpoint("api", f"{base_url}/health/ready")
        results.append(result)
        
        # Liveness check
        result = await self.validate_endpoint("api", f"{base_url}/health/live")
        results.append(result)
        
        # API endpoints
        result = await self.validate_endpoint("api", f"{base_url}/api/products")
        results.append(result)
        
        result = await self.validate_endpoint("api", f"{base_url}/api/categories")
        results.append(result)
        
        # Auth endpoints (should return 422 for missing body)
        result = await self.validate_endpoint("api", f"{base_url}/api/auth/login", expected_status=422)
        results.append(result)
        
        return results
    
    async def validate_web_health(self, base_url: str) -> List[HealthCheckResult]:
        """Validate web frontend health."""
        results = []
        
        # Frontend health check
        result = await self.validate_endpoint("web", f"{base_url}/api/health")
        results.append(result)
        
        # Main page
        result = await self.validate_endpoint("web", base_url)
        results.append(result)
        
        # Key pages
        pages = ["/products", "/about", "/contact", "/staff-login", "/customer-login"]
        for page in pages:
            result = await self.validate_endpoint("web", f"{base_url}{page}")
            results.append(result)
        
        return results
    
    async def validate_cors(self, api_url: str, frontend_url: str) -> HealthCheckResult:
        """Validate CORS configuration."""
        headers = {
            "Origin": frontend_url,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type,Authorization"
        }
        
        start_time = time.time()
        
        try:
            async with self.session.options(
                f"{api_url}/api/products",
                headers=headers
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                cors_headers = {
                    "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
                    "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
                    "access-control-allow-headers": response.headers.get("access-control-allow-headers"),
                    "access-control-allow-credentials": response.headers.get("access-control-allow-credentials")
                }
                
                # Check if CORS is properly configured
                origin_allowed = cors_headers["access-control-allow-origin"] in [frontend_url, "*"]
                methods_allowed = "GET" in (cors_headers["access-control-allow-methods"] or "")
                
                status = "healthy" if origin_allowed and methods_allowed else "unhealthy"
                
                return HealthCheckResult(
                    service="cors",
                    endpoint=f"{api_url}/api/products",
                    status=status,
                    response_time_ms=response_time,
                    status_code=response.status,
                    details=cors_headers
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheckResult(
                service="cors",
                endpoint=f"{api_url}/api/products",
                status="error",
                response_time_ms=response_time,
                error=str(e)
            )
    
    async def validate_database_connectivity(self, api_url: str) -> HealthCheckResult:
        """Validate database connectivity through API."""
        result = await self.validate_endpoint("database", f"{api_url}/health/detailed")
        
        if result.status == "healthy" and result.details:
            # Check database status in detailed health response
            checks = result.details.get("checks", {})
            db_check = checks.get("database", {})
            
            if db_check.get("status") == "healthy":
                result.status = "healthy"
            else:
                result.status = "unhealthy"
                result.error = "Database check failed in detailed health"
        
        result.service = "database"
        return result
    
    async def run_validation(self) -> ValidationReport:
        """Run complete deployment validation."""
        start_time = time.time()
        self.results = []
        
        api_url = self.config.get("api_url")
        web_url = self.config.get("web_url")
        
        logger.info(f"Starting deployment validation for API: {api_url}, Web: {web_url}")
        
        # Validate API health
        if api_url:
            api_results = await self.validate_api_health(api_url)
            self.results.extend(api_results)
            
            # Database connectivity
            db_result = await self.validate_database_connectivity(api_url)
            self.results.append(db_result)
        
        # Validate web health
        if web_url:
            web_results = await self.validate_web_health(web_url)
            self.results.extend(web_results)
        
        # Validate CORS
        if api_url and web_url:
            cors_result = await self.validate_cors(api_url, web_url)
            self.results.append(cors_result)
        
        # Calculate summary
        total_checks = len(self.results)
        passed_checks = len([r for r in self.results if r.status == "healthy"])
        failed_checks = len([r for r in self.results if r.status in ["unhealthy", "error"]])
        degraded_checks = len([r for r in self.results if r.status == "degraded"])
        
        # Determine overall status
        if failed_checks > 0:
            overall_status = "unhealthy"
        elif degraded_checks > 0:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        validation_time = (time.time() - start_time) * 1000
        
        # Create summary
        summary = {
            "services": {},
            "critical_issues": [],
            "warnings": [],
            "performance": {
                "avg_response_time": sum(r.response_time_ms for r in self.results) / len(self.results) if self.results else 0,
                "slowest_endpoint": max(self.results, key=lambda r: r.response_time_ms) if self.results else None
            }
        }
        
        # Group results by service
        for result in self.results:
            if result.service not in summary["services"]:
                summary["services"][result.service] = {"healthy": 0, "degraded": 0, "unhealthy": 0, "error": 0}
            summary["services"][result.service][result.status] += 1
            
            # Collect issues
            if result.status in ["unhealthy", "error"]:
                summary["critical_issues"].append({
                    "service": result.service,
                    "endpoint": result.endpoint,
                    "error": result.error or f"Status: {result.status_code}"
                })
            elif result.status == "degraded":
                summary["warnings"].append({
                    "service": result.service,
                    "endpoint": result.endpoint,
                    "issue": "Performance degraded"
                })
        
        return ValidationReport(
            overall_status=overall_status,
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            degraded_checks=degraded_checks,
            validation_time_ms=validation_time,
            results=self.results,
            summary=summary,
            timestamp=datetime.now(timezone.utc).isoformat()
        )


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Validate MDV deployment health")
    parser.add_argument("--api-url", required=True, help="API base URL")
    parser.add_argument("--web-url", required=True, help="Web frontend URL")
    parser.add_argument("--output", help="Output file for results (JSON)")
    parser.add_argument("--fail-on-error", action="store_true", help="Exit with error code if validation fails")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    config = {
        "api_url": args.api_url.rstrip("/"),
        "web_url": args.web_url.rstrip("/")
    }
    
    async with DeploymentValidator(config) as validator:
        report = await validator.run_validation()
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(asdict(report), f, indent=2, default=str)
        logger.info(f"Results saved to {args.output}")
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"DEPLOYMENT VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Overall Status: {report.overall_status.upper()}")
    print(f"Success Rate: {report.success_rate():.1f}%")
    print(f"Total Checks: {report.total_checks}")
    print(f"Passed: {report.passed_checks}, Failed: {report.failed_checks}, Degraded: {report.degraded_checks}")
    print(f"Validation Time: {report.validation_time_ms:.0f}ms")
    
    if report.summary["critical_issues"]:
        print(f"\nCRITICAL ISSUES:")
        for issue in report.summary["critical_issues"]:
            print(f"  ❌ {issue['service']}: {issue['error']}")
    
    if report.summary["warnings"]:
        print(f"\nWARNINGS:")
        for warning in report.summary["warnings"]:
            print(f"  ⚠️  {warning['service']}: {warning['issue']}")
    
    if args.verbose:
        print(f"\nDETAILED RESULTS:")
        for result in report.results:
            status_icon = {"healthy": "✅", "degraded": "⚠️", "unhealthy": "❌", "error": "💥"}[result.status]
            print(f"  {status_icon} {result.service}: {result.endpoint} ({result.response_time_ms:.0f}ms)")
            if result.error:
                print(f"    Error: {result.error}")
    
    # Exit with appropriate code
    if args.fail_on_error and report.overall_status in ["unhealthy", "error"]:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
