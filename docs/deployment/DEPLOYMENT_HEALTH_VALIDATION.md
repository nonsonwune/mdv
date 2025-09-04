# Deployment Health Validation

This document describes the comprehensive deployment health validation system for the MDV platform.

## Overview

The deployment health validation system provides automated monitoring and validation of deployed services to ensure they are functioning correctly and meeting performance requirements.

## Components

### 1. Validation Scripts

#### Python Validation Script (`scripts/deployment/validate-deployment.py`)
- Comprehensive health checks for API and web services
- Async HTTP client for efficient concurrent testing
- Detailed reporting with JSON output
- Configurable timeouts and thresholds

#### Shell Wrapper Script (`scripts/deployment/validate-deployment.sh`)
- Easy-to-use command-line interface
- Environment-specific URL configuration
- Quick connectivity checks
- Integration with CI/CD pipelines

### 2. Configuration

#### Validation Configuration (`scripts/deployment/validation-config.yml`)
- Comprehensive health check definitions
- Environment-specific settings
- Performance thresholds
- Alerting rules
- Recovery procedures

### 3. Automation

#### GitHub Actions Workflow (`.github/workflows/deployment-validation.yml`)
- Automated validation after deployments
- Scheduled health checks
- Manual trigger capability
- Slack notifications
- Artifact storage

### 4. Monitoring

#### Grafana Dashboard (`monitoring/dashboards/deployment-health.json`)
- Real-time health status visualization
- Performance metrics tracking
- Historical trend analysis
- Alert integration

## Health Checks

### API Service Checks

1. **Basic Health Check** (`/health`)
   - Service availability
   - Basic response validation
   - Response time monitoring

2. **Detailed Health Check** (`/health/detailed`)
   - Database connectivity
   - System resource usage
   - External dependencies
   - Performance metrics

3. **Readiness Probe** (`/health/ready`)
   - Service readiness for traffic
   - Dependency availability
   - Resource thresholds

4. **Liveness Probe** (`/health/live`)
   - Service process health
   - Basic functionality

5. **API Endpoints**
   - Products API
   - Categories API
   - Authentication endpoints

### Web Frontend Checks

1. **Frontend Health** (`/api/health`)
   - Next.js application status
   - Build information

2. **Page Accessibility**
   - Home page
   - Product pages
   - Authentication pages
   - Static pages

3. **Performance Validation**
   - Page load times
   - Resource loading
   - Client-side functionality

### Integration Checks

1. **CORS Configuration**
   - Cross-origin request validation
   - Header verification
   - Policy compliance

2. **API-Frontend Communication**
   - End-to-end connectivity
   - Data flow validation
   - Authentication flow

## Usage

### Manual Validation

#### Quick Health Check
```bash
# Validate production deployment
./scripts/deployment/validate-deployment.sh --environment production

# Validate with custom URLs
./scripts/deployment/validate-deployment.sh \
  --api-url https://api.example.com \
  --web-url https://web.example.com

# Quick connectivity check only
./scripts/deployment/validate-deployment.sh --quick --verbose
```

#### Comprehensive Validation
```bash
# Full validation with results output
./scripts/deployment/validate-deployment.sh \
  --environment production \
  --output results.json \
  --verbose

# Fail on any errors (for CI/CD)
./scripts/deployment/validate-deployment.sh \
  --environment production \
  --fail-on-error
```

### Python Script Direct Usage
```bash
# Basic validation
python scripts/deployment/validate-deployment.py \
  --api-url https://mdv-api-production.up.railway.app \
  --web-url https://mdv-web-production.up.railway.app

# With output and error handling
python scripts/deployment/validate-deployment.py \
  --api-url https://mdv-api-production.up.railway.app \
  --web-url https://mdv-web-production.up.railway.app \
  --output validation-results.json \
  --fail-on-error \
  --verbose
```

### CI/CD Integration

The validation system automatically runs:

1. **After Deployments**: Triggered by successful Railway deployments
2. **Scheduled Checks**: Every 15 minutes during business hours
3. **Manual Triggers**: Via GitHub Actions interface

#### GitHub Actions Workflow
```yaml
# Trigger manual validation
name: Manual Deployment Validation
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to validate'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging
```

## Monitoring and Alerting

### Grafana Dashboard

Access the deployment health dashboard at:
- **Production**: `https://grafana.mdv.com/d/deployment-health`
- **Staging**: `https://grafana-staging.mdv.com/d/deployment-health`

#### Key Metrics
- Overall deployment status
- Service availability percentages
- Response time trends
- Health check success rates
- Critical issues count

### Alert Channels

1. **Slack Notifications**
   - `#alerts` channel for critical issues
   - `#general` channel for status updates

2. **Email Alerts**
   - DevOps team notifications
   - Management reports

3. **PagerDuty Integration**
   - Critical service failures
   - Escalation procedures

### Alert Rules

1. **Critical Service Down**
   - Trigger: Any critical health check fails
   - Severity: Critical
   - Channels: Slack, Email, PagerDuty

2. **Performance Degradation**
   - Trigger: Response time > 5 seconds
   - Severity: Warning
   - Channels: Slack, Email

3. **High Error Rate**
   - Trigger: Error rate > 5%
   - Severity: Warning
   - Channels: Slack

## Troubleshooting

### Common Issues

#### API Not Reachable
```bash
# Check service status
curl -I https://mdv-api-production.up.railway.app/health

# Check Railway service logs
railway logs --service mdv-api

# Validate DNS resolution
nslookup mdv-api-production.up.railway.app
```

#### Database Connection Issues
```bash
# Check detailed health endpoint
curl https://mdv-api-production.up.railway.app/health/detailed

# Check database service status
railway status --service mdv-postgres
```

#### CORS Configuration Problems
```bash
# Test CORS headers
curl -X OPTIONS \
  -H "Origin: https://mdv-web-production.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  https://mdv-api-production.up.railway.app/api/products
```

### Recovery Procedures

#### Automatic Recovery
- Service restart on health check failure
- Maximum 3 retry attempts
- Exponential backoff

#### Manual Recovery
1. **Database Issues**: See `docs/runbooks/database-recovery.md`
2. **Redis Issues**: See `docs/runbooks/redis-recovery.md`
3. **Service Restart**: Use Railway dashboard or CLI

## Configuration

### Environment Variables

#### Required
- `API_URL`: Base URL for API service
- `WEB_URL`: Base URL for web frontend

#### Optional
- `SLACK_WEBHOOK_URL`: Slack notifications
- `PAGERDUTY_INTEGRATION_KEY`: PagerDuty alerts
- `SMTP_SERVER`: Email notifications

### Thresholds

#### Response Time
- Excellent: < 500ms
- Good: < 1000ms
- Acceptable: < 2000ms
- Poor: > 5000ms

#### Availability
- Target: 99.9%
- Minimum: 99.0%

#### Error Rate
- Warning: > 1.0%
- Critical: > 5.0%

## Best Practices

1. **Regular Monitoring**
   - Review dashboard daily
   - Investigate degraded performance
   - Monitor trend changes

2. **Proactive Maintenance**
   - Schedule maintenance windows
   - Update health check thresholds
   - Review alert configurations

3. **Incident Response**
   - Follow runbook procedures
   - Document incidents
   - Conduct post-mortems

4. **Continuous Improvement**
   - Analyze failure patterns
   - Update validation criteria
   - Enhance monitoring coverage

## Support

For issues with the deployment validation system:

1. **Check Documentation**: Review this guide and runbooks
2. **View Logs**: Check GitHub Actions and Railway logs
3. **Contact Team**: Reach out via Slack `#devops` channel
4. **Create Issue**: Open GitHub issue for bugs or enhancements
