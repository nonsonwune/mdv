#!/usr/bin/env python3
"""
Database Connection Pool Load Testing Script

Tests the database connection pool under various load scenarios to ensure
the optimized settings can handle 200+ concurrent users without errors.
"""

import asyncio
import time
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Add the backend directory to the path
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from mdv.db import get_async_db, get_pool_status, get_database_health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LoadTestResult:
    """Results from a load test run."""
    concurrent_users: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    requests_per_second: float
    error_rate: float
    duration: float


class DatabaseLoadTester:
    """Database connection pool load tester."""
    
    def __init__(self):
        self.results: List[LoadTestResult] = []
    
    async def simple_db_query(self, session: AsyncSession) -> float:
        """Execute a simple database query and return response time."""
        start_time = time.time()
        try:
            result = await session.execute(text("SELECT 1 as test"))
            await result.fetchone()
            return time.time() - start_time
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise
    
    async def simulate_user_session(self, user_id: int, requests_per_user: int = 10) -> List[float]:
        """Simulate a user session with multiple database requests."""
        response_times = []
        
        for request_num in range(requests_per_user):
            try:
                async for session in get_async_db():
                    response_time = await self.simple_db_query(session)
                    response_times.append(response_time)
                    break  # Exit the async generator
                
                # Small delay between requests to simulate real usage
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"User {user_id} request {request_num} failed: {e}")
                response_times.append(float('inf'))  # Mark as failed
        
        return response_times
    
    async def run_load_test(self, concurrent_users: int, requests_per_user: int = 10) -> LoadTestResult:
        """Run a load test with specified number of concurrent users."""
        logger.info(f"Starting load test: {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        start_time = time.time()
        
        # Create tasks for all concurrent users
        tasks = [
            self.simulate_user_session(user_id, requests_per_user)
            for user_id in range(concurrent_users)
        ]
        
        # Execute all tasks concurrently
        all_response_times = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Process results
        successful_times = []
        failed_count = 0
        
        for user_times in all_response_times:
            if isinstance(user_times, Exception):
                failed_count += requests_per_user
                continue
            
            for response_time in user_times:
                if response_time == float('inf'):
                    failed_count += 1
                else:
                    successful_times.append(response_time)
        
        total_requests = concurrent_users * requests_per_user
        successful_requests = len(successful_times)
        failed_requests = failed_count
        
        # Calculate statistics
        if successful_times:
            avg_response_time = statistics.mean(successful_times)
            min_response_time = min(successful_times)
            max_response_time = max(successful_times)
        else:
            avg_response_time = min_response_time = max_response_time = 0
        
        requests_per_second = total_requests / duration if duration > 0 else 0
        error_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0
        
        result = LoadTestResult(
            concurrent_users=concurrent_users,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            requests_per_second=requests_per_second,
            error_rate=error_rate,
            duration=duration
        )
        
        self.results.append(result)
        
        logger.info(f"Load test completed: {successful_requests}/{total_requests} successful "
                   f"({error_rate:.1f}% error rate), {avg_response_time:.3f}s avg response time")
        
        return result
    
    async def run_progressive_load_test(self) -> None:
        """Run progressive load tests with increasing concurrent users."""
        test_scenarios = [10, 25, 50, 100, 150, 200, 250]
        
        logger.info("Starting progressive load test")
        
        for concurrent_users in test_scenarios:
            # Get pool status before test
            pool_status_before = get_pool_status()
            logger.info(f"Pool status before {concurrent_users} users: {pool_status_before}")
            
            # Run the test
            result = await self.run_load_test(concurrent_users)
            
            # Get pool status after test
            pool_status_after = get_pool_status()
            logger.info(f"Pool status after {concurrent_users} users: {pool_status_after}")
            
            # Check if we should stop (too many errors)
            if result.error_rate > 10:  # More than 10% error rate
                logger.warning(f"High error rate ({result.error_rate:.1f}%) at {concurrent_users} users. "
                              "Consider this the maximum safe load.")
                break
            
            # Wait between tests to let the pool recover
            await asyncio.sleep(5)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self) -> None:
        """Print a summary of all test results."""
        print("\n" + "="*80)
        print("LOAD TEST SUMMARY")
        print("="*80)
        
        print(f"{'Users':<8} {'Total':<8} {'Success':<8} {'Failed':<8} {'Error%':<8} "
              f"{'Avg(ms)':<10} {'Min(ms)':<10} {'Max(ms)':<10} {'RPS':<8}")
        print("-" * 80)
        
        for result in self.results:
            print(f"{result.concurrent_users:<8} {result.total_requests:<8} "
                  f"{result.successful_requests:<8} {result.failed_requests:<8} "
                  f"{result.error_rate:<8.1f} {result.avg_response_time*1000:<10.1f} "
                  f"{result.min_response_time*1000:<10.1f} {result.max_response_time*1000:<10.1f} "
                  f"{result.requests_per_second:<8.1f}")
        
        print("\nKEY FINDINGS:")
        
        # Find maximum successful load
        max_successful = max((r for r in self.results if r.error_rate < 5), 
                           key=lambda x: x.concurrent_users, default=None)
        
        if max_successful:
            print(f"✓ Maximum safe load: {max_successful.concurrent_users} concurrent users")
            print(f"✓ At max load: {max_successful.error_rate:.1f}% error rate, "
                  f"{max_successful.avg_response_time*1000:.1f}ms avg response time")
        
        # Check if we met the 200+ user requirement
        users_200_plus = [r for r in self.results if r.concurrent_users >= 200 and r.error_rate < 5]
        if users_200_plus:
            print("✓ PASSED: System handles 200+ concurrent users successfully")
        else:
            print("✗ FAILED: System cannot handle 200+ concurrent users reliably")
        
        print("="*80)


async def main():
    """Main function to run the load tests."""
    tester = DatabaseLoadTester()
    
    try:
        # Check initial database health
        health = get_database_health()
        logger.info(f"Initial database health: {health}")
        
        if not health.get('healthy', False):
            logger.error("Database is not healthy. Aborting load test.")
            return
        
        # Run progressive load test
        await tester.run_progressive_load_test()
        
        # Final health check
        final_health = get_database_health()
        logger.info(f"Final database health: {final_health}")
        
    except Exception as e:
        logger.error(f"Load test failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
