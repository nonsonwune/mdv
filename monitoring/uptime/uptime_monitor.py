#!/usr/bin/env python3
"""
Custom Uptime Monitoring Script for MDV Platform

Monitors critical endpoints and reports uptime statistics.
Sends alerts when services are down or degraded.
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
import yaml
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MonitorResult:
    """Result of a monitoring check."""
    endpoint_name: str
    url: str
    status_code: Optional[int]
    response_time: float
    success: bool
    error: Optional[str]
    timestamp: datetime
    checks_passed: Optional[Dict[str, bool]] = None


@dataclass
class UptimeStats:
    """Uptime statistics for an endpoint."""
    endpoint_name: str
    total_checks: int
    successful_checks: int
    failed_checks: int
    uptime_percentage: float
    avg_response_time: float
    last_check: datetime
    last_downtime: Optional[datetime] = None


class UptimeMonitor:
    """Custom uptime monitoring system."""
    
    def __init__(self, config_path: str = "monitoring/uptime/uptime-config.yml"):
        self.config = self._load_config(config_path)
        self.results: List[MonitorResult] = []
        self.stats: Dict[str, UptimeStats] = {}
        self.session: Optional[aiohttp.ClientSession] = None
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load monitoring configuration."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"Config file not found: {config_path}")
            return {"custom_monitoring": {"endpoints": []}}
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def check_endpoint(self, endpoint_config: Dict[str, Any]) -> MonitorResult:
        """Check a single endpoint."""
        name = endpoint_config["name"]
        url = endpoint_config["url"]
        method = endpoint_config.get("method", "GET")
        timeout = endpoint_config.get("timeout", 10)
        expected_status = endpoint_config.get("expected_status", 200)
        checks = endpoint_config.get("checks", [])
        
        start_time = time.time()
        
        try:
            async with self.session.request(
                method, url, timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                # Check status code
                status_ok = response.status == expected_status
                
                # Check response content if specified
                checks_passed = {}
                if checks and status_ok:
                    try:
                        response_data = await response.json()
                        for check in checks:
                            path = check["path"]
                            expected = check["expected"]
                            actual = self._get_nested_value(response_data, path)
                            checks_passed[path] = actual == expected
                    except Exception as e:
                        logger.warning(f"Failed to parse response for {name}: {e}")
                        checks_passed = {"parse_error": False}
                
                success = status_ok and all(checks_passed.values()) if checks_passed else status_ok
                
                return MonitorResult(
                    endpoint_name=name,
                    url=url,
                    status_code=response.status,
                    response_time=response_time,
                    success=success,
                    error=None,
                    timestamp=datetime.now(),
                    checks_passed=checks_passed if checks_passed else None
                )
        
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return MonitorResult(
                endpoint_name=name,
                url=url,
                status_code=None,
                response_time=response_time,
                success=False,
                error=str(e),
                timestamp=datetime.now()
            )
    
    def _get_nested_value(self, data: Dict, path: str) -> Any:
        """Get nested value from dictionary using dot notation."""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value
    
    async def run_checks(self) -> List[MonitorResult]:
        """Run all monitoring checks."""
        endpoints = self.config.get("custom_monitoring", {}).get("endpoints", [])
        
        if not endpoints:
            logger.warning("No endpoints configured for monitoring")
            return []
        
        logger.info(f"Running checks for {len(endpoints)} endpoints")
        
        tasks = [self.check_endpoint(endpoint) for endpoint in endpoints]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and log them
        valid_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Check failed with exception: {result}")
            else:
                valid_results.append(result)
                self.results.append(result)
        
        # Update statistics
        self._update_stats(valid_results)
        
        # Check for alerts
        await self._check_alerts(valid_results)
        
        return valid_results
    
    def _update_stats(self, results: List[MonitorResult]) -> None:
        """Update uptime statistics."""
        for result in results:
            name = result.endpoint_name
            
            if name not in self.stats:
                self.stats[name] = UptimeStats(
                    endpoint_name=name,
                    total_checks=0,
                    successful_checks=0,
                    failed_checks=0,
                    uptime_percentage=0.0,
                    avg_response_time=0.0,
                    last_check=result.timestamp
                )
            
            stats = self.stats[name]
            stats.total_checks += 1
            stats.last_check = result.timestamp
            
            if result.success:
                stats.successful_checks += 1
            else:
                stats.failed_checks += 1
                stats.last_downtime = result.timestamp
            
            # Calculate uptime percentage
            stats.uptime_percentage = (stats.successful_checks / stats.total_checks) * 100
            
            # Calculate average response time (simple moving average)
            if stats.total_checks == 1:
                stats.avg_response_time = result.response_time
            else:
                stats.avg_response_time = (
                    (stats.avg_response_time * (stats.total_checks - 1) + result.response_time) 
                    / stats.total_checks
                )
    
    async def _check_alerts(self, results: List[MonitorResult]) -> None:
        """Check if any alerts should be sent."""
        for result in results:
            if not result.success:
                await self._send_alert(result)
    
    async def _send_alert(self, result: MonitorResult) -> None:
        """Send alert for failed check."""
        logger.warning(f"ALERT: {result.endpoint_name} is down - {result.error}")
        
        # Send email alert if configured
        email_config = self.config.get("notifications", {}).get("email")
        if email_config:
            await self._send_email_alert(result, email_config)
        
        # Send Slack alert if configured
        slack_config = self.config.get("notifications", {}).get("slack")
        if slack_config:
            await self._send_slack_alert(result, slack_config)
    
    async def _send_email_alert(self, result: MonitorResult, email_config: Dict[str, Any]) -> None:
        """Send email alert."""
        try:
            msg = MimeMultipart()
            msg['From'] = email_config['from']
            msg['To'] = ', '.join(email_config['to'])
            msg['Subject'] = f"🚨 MDV Service Down: {result.endpoint_name}"
            
            body = f"""
Service Alert: {result.endpoint_name} is down

URL: {result.url}
Status Code: {result.status_code or 'N/A'}
Error: {result.error or 'Unknown error'}
Response Time: {result.response_time:.2f}ms
Timestamp: {result.timestamp.isoformat()}

Please investigate immediately.
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port'])
            server.starttls()
            server.login(email_config['username'], email_config['password'])
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for {result.endpoint_name}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    async def _send_slack_alert(self, result: MonitorResult, slack_config: Dict[str, Any]) -> None:
        """Send Slack alert."""
        try:
            webhook_url = slack_config['webhook_url']
            
            payload = {
                "channel": slack_config.get('channel', '#alerts'),
                "username": slack_config.get('username', 'MDV Monitor'),
                "text": f"🚨 Service Down: {result.endpoint_name}",
                "attachments": [
                    {
                        "color": "danger",
                        "fields": [
                            {"title": "Service", "value": result.endpoint_name, "short": True},
                            {"title": "URL", "value": result.url, "short": True},
                            {"title": "Status", "value": str(result.status_code or 'N/A'), "short": True},
                            {"title": "Error", "value": result.error or 'Unknown', "short": True},
                            {"title": "Response Time", "value": f"{result.response_time:.2f}ms", "short": True},
                            {"title": "Time", "value": result.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"), "short": True}
                        ]
                    }
                ]
            }
            
            async with self.session.post(webhook_url, json=payload) as response:
                if response.status == 200:
                    logger.info(f"Slack alert sent for {result.endpoint_name}")
                else:
                    logger.error(f"Failed to send Slack alert: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
    
    def get_uptime_report(self, hours: int = 24) -> Dict[str, Any]:
        """Generate uptime report for the last N hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_results = [r for r in self.results if r.timestamp >= cutoff_time]
        
        report = {
            "period": f"Last {hours} hours",
            "generated_at": datetime.now().isoformat(),
            "endpoints": {},
            "overall": {
                "total_checks": len(recent_results),
                "successful_checks": sum(1 for r in recent_results if r.success),
                "failed_checks": sum(1 for r in recent_results if not r.success),
                "uptime_percentage": 0.0
            }
        }
        
        if recent_results:
            report["overall"]["uptime_percentage"] = (
                report["overall"]["successful_checks"] / report["overall"]["total_checks"]
            ) * 100
        
        # Per-endpoint stats
        for name, stats in self.stats.items():
            endpoint_recent = [r for r in recent_results if r.endpoint_name == name]
            if endpoint_recent:
                successful = sum(1 for r in endpoint_recent if r.success)
                total = len(endpoint_recent)
                uptime = (successful / total) * 100 if total > 0 else 0
                avg_response = sum(r.response_time for r in endpoint_recent) / total if total > 0 else 0
                
                report["endpoints"][name] = {
                    "uptime_percentage": uptime,
                    "avg_response_time": avg_response,
                    "total_checks": total,
                    "successful_checks": successful,
                    "failed_checks": total - successful,
                    "last_check": stats.last_check.isoformat(),
                    "last_downtime": stats.last_downtime.isoformat() if stats.last_downtime else None
                }
        
        return report
    
    def save_report(self, report: Dict[str, Any], filename: str = None) -> None:
        """Save uptime report to file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"uptime_report_{timestamp}.json"
        
        Path("monitoring/reports").mkdir(parents=True, exist_ok=True)
        filepath = Path("monitoring/reports") / filename
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Report saved to {filepath}")


async def main():
    """Main monitoring loop."""
    async with UptimeMonitor() as monitor:
        logger.info("Starting uptime monitoring...")
        
        # Run initial check
        results = await monitor.run_checks()
        
        # Print results
        print("\n" + "="*80)
        print("UPTIME MONITORING RESULTS")
        print("="*80)
        
        for result in results:
            status = "✅ UP" if result.success else "❌ DOWN"
            print(f"{status} {result.endpoint_name:<30} {result.response_time:>8.2f}ms")
            if not result.success:
                print(f"    Error: {result.error}")
        
        # Generate and save report
        report = monitor.get_uptime_report(24)
        monitor.save_report(report)
        
        print(f"\n📊 Overall Uptime: {report['overall']['uptime_percentage']:.2f}%")
        print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
