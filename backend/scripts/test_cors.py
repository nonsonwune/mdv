#!/usr/bin/env python3
"""
CORS Configuration Testing Script

Tests CORS settings across different environments and scenarios to ensure
proper cross-origin request handling.
"""

import asyncio
import aiohttp
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CORSTestResult:
    """Result of a CORS test."""
    test_name: str
    origin: str
    method: str
    endpoint: str
    success: bool
    status_code: Optional[int] = None
    headers: Optional[Dict[str, str]] = None
    error: Optional[str] = None
    preflight_success: Optional[bool] = None


class CORSTestSuite:
    """CORS testing suite for different environments."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.results: List[CORSTestResult] = []
    
    async def test_cors_configuration(self) -> List[CORSTestResult]:
        """Run comprehensive CORS tests."""
        logger.info(f"Starting CORS tests against {self.base_url}")
        
        # Test scenarios
        test_scenarios = [
            # Development origins
            {
                "name": "localhost:3000 GET request",
                "origin": "http://localhost:3000",
                "method": "GET",
                "endpoint": "/api/products"
            },
            {
                "name": "localhost:3000 POST request",
                "origin": "http://localhost:3000",
                "method": "POST",
                "endpoint": "/api/auth/login"
            },
            {
                "name": "127.0.0.1:3000 GET request",
                "origin": "http://127.0.0.1:3000",
                "method": "GET",
                "endpoint": "/api/categories"
            },
            # Production origins
            {
                "name": "Production frontend GET",
                "origin": "https://mdv-web-production.up.railway.app",
                "method": "GET",
                "endpoint": "/api/products"
            },
            {
                "name": "Production frontend POST",
                "origin": "https://mdv-web-production.up.railway.app",
                "method": "POST",
                "endpoint": "/api/auth/login"
            },
            # Invalid origins
            {
                "name": "Invalid origin",
                "origin": "https://malicious-site.com",
                "method": "GET",
                "endpoint": "/api/products"
            },
            {
                "name": "No origin header",
                "origin": None,
                "method": "GET",
                "endpoint": "/api/products"
            },
            # Complex requests requiring preflight
            {
                "name": "PUT request with custom headers",
                "origin": "http://localhost:3000",
                "method": "PUT",
                "endpoint": "/api/admin/products/1",
                "headers": {"Authorization": "Bearer test-token", "Content-Type": "application/json"}
            },
            {
                "name": "DELETE request",
                "origin": "http://localhost:3000",
                "method": "DELETE",
                "endpoint": "/api/admin/products/1"
            },
        ]
        
        async with aiohttp.ClientSession() as session:
            for scenario in test_scenarios:
                result = await self._test_cors_scenario(session, scenario)
                self.results.append(result)
        
        return self.results
    
    async def _test_cors_scenario(self, session: aiohttp.ClientSession, scenario: Dict[str, Any]) -> CORSTestResult:
        """Test a specific CORS scenario."""
        test_name = scenario["name"]
        origin = scenario["origin"]
        method = scenario["method"]
        endpoint = scenario["endpoint"]
        custom_headers = scenario.get("headers", {})
        
        logger.info(f"Testing: {test_name}")
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            # Test preflight request for complex requests
            preflight_success = None
            if method in ["PUT", "DELETE", "PATCH"] or custom_headers:
                preflight_success = await self._test_preflight(session, url, origin, method, custom_headers)
            
            # Test actual request
            headers = {}
            if origin:
                headers["Origin"] = origin
            headers.update(custom_headers)
            
            # For POST requests, add some test data
            data = None
            if method == "POST" and "login" in endpoint:
                data = json.dumps({"email": "test@example.com", "password": "test123"})
                headers["Content-Type"] = "application/json"
            
            async with session.request(method, url, headers=headers, data=data) as response:
                response_headers = dict(response.headers)
                
                # Check CORS headers
                cors_headers = {
                    "Access-Control-Allow-Origin": response_headers.get("Access-Control-Allow-Origin"),
                    "Access-Control-Allow-Credentials": response_headers.get("Access-Control-Allow-Credentials"),
                    "Access-Control-Allow-Methods": response_headers.get("Access-Control-Allow-Methods"),
                    "Access-Control-Allow-Headers": response_headers.get("Access-Control-Allow-Headers"),
                }
                
                # Determine success based on CORS headers and origin
                success = self._evaluate_cors_success(origin, cors_headers, response.status)
                
                return CORSTestResult(
                    test_name=test_name,
                    origin=origin or "None",
                    method=method,
                    endpoint=endpoint,
                    success=success,
                    status_code=response.status,
                    headers=cors_headers,
                    preflight_success=preflight_success
                )
        
        except Exception as e:
            logger.error(f"Error testing {test_name}: {e}")
            return CORSTestResult(
                test_name=test_name,
                origin=origin or "None",
                method=method,
                endpoint=endpoint,
                success=False,
                error=str(e)
            )
    
    async def _test_preflight(self, session: aiohttp.ClientSession, url: str, origin: str, 
                            method: str, custom_headers: Dict[str, str]) -> bool:
        """Test CORS preflight request."""
        if not origin:
            return True  # No preflight needed without origin
        
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": method,
        }
        
        if custom_headers:
            requested_headers = list(custom_headers.keys())
            headers["Access-Control-Request-Headers"] = ", ".join(requested_headers)
        
        try:
            async with session.options(url, headers=headers) as response:
                # Check if preflight was successful
                allow_origin = response.headers.get("Access-Control-Allow-Origin")
                allow_methods = response.headers.get("Access-Control-Allow-Methods", "")
                allow_headers = response.headers.get("Access-Control-Allow-Headers", "")
                
                # Verify origin is allowed
                origin_allowed = (allow_origin == origin or allow_origin == "*")
                
                # Verify method is allowed
                method_allowed = method.upper() in allow_methods.upper()
                
                # Verify headers are allowed (if any were requested)
                headers_allowed = True
                if custom_headers:
                    for header in custom_headers.keys():
                        if header.lower() not in allow_headers.lower() and "*" not in allow_headers:
                            headers_allowed = False
                            break
                
                return origin_allowed and method_allowed and headers_allowed
        
        except Exception as e:
            logger.error(f"Preflight request failed: {e}")
            return False
    
    def _evaluate_cors_success(self, origin: Optional[str], cors_headers: Dict[str, str], status_code: int) -> bool:
        """Evaluate if CORS configuration is working correctly."""
        if not origin:
            # Requests without origin should work (same-origin)
            return status_code < 500
        
        allow_origin = cors_headers.get("Access-Control-Allow-Origin")
        
        # Check if origin is properly handled
        if origin in ["http://localhost:3000", "http://127.0.0.1:3000", "https://mdv-web-production.up.railway.app"]:
            # Valid origins should be allowed
            return allow_origin == origin and status_code < 500
        else:
            # Invalid origins should either be rejected or not have CORS headers
            return allow_origin != origin
    
    def print_results(self) -> None:
        """Print test results in a formatted table."""
        print("\n" + "="*120)
        print("CORS CONFIGURATION TEST RESULTS")
        print("="*120)
        
        print(f"{'Test Name':<35} {'Origin':<40} {'Method':<8} {'Status':<8} {'Success':<8} {'CORS Headers'}")
        print("-" * 120)
        
        for result in self.results:
            origin_display = result.origin[:37] + "..." if len(result.origin) > 40 else result.origin
            status_display = str(result.status_code) if result.status_code else "ERROR"
            success_display = "✓" if result.success else "✗"
            
            cors_info = ""
            if result.headers and result.headers.get("Access-Control-Allow-Origin"):
                cors_info = f"Origin: {result.headers['Access-Control-Allow-Origin']}"
            elif result.error:
                cors_info = f"Error: {result.error[:30]}..."
            
            print(f"{result.test_name:<35} {origin_display:<40} {result.method:<8} {status_display:<8} {success_display:<8} {cors_info}")
        
        # Summary
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r.success)
        
        print("\n" + "="*120)
        print(f"SUMMARY: {successful_tests}/{total_tests} tests passed ({(successful_tests/total_tests)*100:.1f}%)")
        
        if successful_tests == total_tests:
            print("✅ All CORS tests passed! Configuration is working correctly.")
        else:
            print("❌ Some CORS tests failed. Review the configuration.")
            
            failed_tests = [r for r in self.results if not r.success]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test.test_name}: {test.error or 'CORS headers incorrect'}")
        
        print("="*120)


async def main():
    """Main function to run CORS tests."""
    import sys
    
    # Get base URL from command line or use default
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tester = CORSTestSuite(base_url)
    
    try:
        await tester.test_cors_configuration()
        tester.print_results()
    except Exception as e:
        logger.error(f"CORS testing failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
