# Production Monitoring Setup Guide

This guide provides comprehensive monitoring setup for the MDV e-commerce platform using Grafana dashboards and alerting.

## Overview

The monitoring stack includes:
- **Health Check Endpoints**: Built-in API health monitoring
- **Application Metrics**: Request rates, response times, error rates
- **Infrastructure Metrics**: Database connections, memory, CPU usage
- **Business Metrics**: Order processing, payment success rates
- **Alerting**: Automated notifications for critical issues

## Health Check Endpoints

The API provides multiple health check endpoints for different monitoring needs:

### Basic Health Check
```
GET /health
```
Lightweight endpoint for load balancers and basic uptime monitoring.

### Liveness Probe
```
GET /health/live
```
Kubernetes liveness probe - checks if the application is running.

### Readiness Probe
```
GET /health/ready
```
Kubernetes readiness probe - checks if the application is ready to serve traffic.
Returns 503 if any critical dependency is unhealthy.

### Detailed Health Check
```
GET /health/detailed
```
Comprehensive health information including:
- Database connection pool status
- System resource usage (CPU, memory, disk)
- Request metrics and error rates
- External dependency status (Redis, etc.)

## Grafana Dashboard Configuration

### 1. API Performance Dashboard

**Panels:**
- Request Rate (requests/second)
- Response Time (95th percentile, average)
- Error Rate (4xx, 5xx errors)
- Active Connections
- Request Duration Histogram

**Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Response time 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"4..|5.."}[5m]) / rate(http_requests_total[5m])
```

### 2. Database Monitoring Dashboard

**Panels:**
- Connection Pool Usage
- Active Connections
- Connection Pool Exhaustion Events
- Database Response Time
- Circuit Breaker Status

**Health Check Integration:**
```bash
# Monitor database health
curl -s http://api-url/health/detailed | jq '.checks.database'
```

### 3. Infrastructure Dashboard

**Panels:**
- CPU Usage
- Memory Usage
- Disk Usage
- Network I/O
- Application Uptime

### 4. Business Metrics Dashboard

**Panels:**
- Order Creation Rate
- Payment Success Rate
- User Registration Rate
- Product View Rate
- Cart Abandonment Rate

## Alerting Rules

### Critical Alerts (P0)

1. **API Down**
   - Condition: Health check fails for > 2 minutes
   - Action: Immediate notification

2. **High Error Rate**
   - Condition: Error rate > 10% for > 5 minutes
   - Action: Immediate notification

3. **Database Connection Pool Exhausted**
   - Condition: Available connections < 10% for > 2 minutes
   - Action: Immediate notification

4. **Circuit Breaker Open**
   - Condition: Database circuit breaker open
   - Action: Immediate notification

### Warning Alerts (P1)

1. **High Response Time**
   - Condition: 95th percentile > 2 seconds for > 10 minutes
   - Action: Notification after 10 minutes

2. **High Memory Usage**
   - Condition: Memory usage > 80% for > 15 minutes
   - Action: Notification after 15 minutes

3. **High CPU Usage**
   - Condition: CPU usage > 80% for > 15 minutes
   - Action: Notification after 15 minutes

## Implementation Steps

### 1. Set up Monitoring Infrastructure

For Railway deployment, use Railway's built-in monitoring or external services:

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  grafana-storage:
```

### 2. Configure Prometheus

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mdv-api'
    static_configs:
      - targets: ['mdv-api:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s
  
  - job_name: 'mdv-health'
    static_configs:
      - targets: ['mdv-api:8000']
    metrics_path: '/health/detailed'
    scrape_interval: 30s
```

### 3. Create Grafana Dashboards

Import the dashboard JSON files from `monitoring/grafana/dashboards/`:
- `api-performance.json`
- `database-monitoring.json`
- `infrastructure.json`
- `business-metrics.json`

### 4. Set up Alerting

Configure alert channels in Grafana:
- Slack integration for team notifications
- PagerDuty for critical alerts
- Email for warning alerts

### 5. Health Check Monitoring Script

```bash
#!/bin/bash
# monitoring/health-check.sh

API_URL="https://mdv-api-production.up.railway.app"
SLACK_WEBHOOK="your-slack-webhook-url"

# Check API health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")

if [ "$HEALTH_STATUS" != "200" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 MDV API Health Check Failed - Status: '$HEALTH_STATUS'"}' \
        "$SLACK_WEBHOOK"
fi

# Check detailed health
DETAILED_HEALTH=$(curl -s "$API_URL/health/detailed")
ERROR_RATE=$(echo "$DETAILED_HEALTH" | jq -r '.metrics.requests.error_rate // 0')

if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"⚠️ MDV API High Error Rate: '$ERROR_RATE'%"}' \
        "$SLACK_WEBHOOK"
fi
```

## Metrics Collection

### Application Metrics

The API automatically collects:
- Request count and duration
- Error rates by status code
- Database connection pool metrics
- Circuit breaker state

### Custom Business Metrics

Add custom metrics for business KPIs:

```python
# In your API endpoints
from prometheus_client import Counter, Histogram

order_created_counter = Counter('orders_created_total', 'Total orders created')
payment_success_counter = Counter('payments_successful_total', 'Successful payments')
payment_failed_counter = Counter('payments_failed_total', 'Failed payments')

@app.post("/api/orders")
async def create_order():
    # ... order creation logic
    order_created_counter.inc()
    return order
```

## Dashboard URLs

Once set up, access dashboards at:
- Grafana: `http://localhost:3001` (local) or your Grafana URL
- Prometheus: `http://localhost:9090` (local) or your Prometheus URL

## Maintenance

### Regular Tasks
1. Review dashboard performance weekly
2. Update alert thresholds based on traffic patterns
3. Archive old metrics data monthly
4. Test alert channels monthly

### Troubleshooting
1. Check health endpoints first: `/health/detailed`
2. Review Grafana dashboard for patterns
3. Check application logs for errors
4. Verify database connection pool status

## Security Considerations

1. Secure Grafana with proper authentication
2. Use read-only database users for monitoring queries
3. Limit network access to monitoring endpoints
4. Regularly update monitoring stack components

## Cost Optimization

1. Set appropriate data retention policies
2. Use sampling for high-volume metrics
3. Archive historical data to cheaper storage
4. Monitor monitoring infrastructure costs
