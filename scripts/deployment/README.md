# Deployment Health Validation

This directory contains comprehensive deployment health validation tools for the MDV platform.

## Quick Start

### Basic Usage

```bash
# Validate production deployment
./validate-deployment.sh --environment production

# Validate with custom URLs
./validate-deployment.sh \
  --api-url https://your-api.com \
  --web-url https://your-web.com

# Save results to file
./validate-deployment.sh \
  --environment production \
  --output results.json \
  --verbose
```

### Python Script Direct Usage

```bash
# Basic validation
python3 validate-deployment.py \
  --api-url https://mdv-api-production.up.railway.app \
  --web-url https://mdv-web-production.up.railway.app

# With comprehensive options
python3 validate-deployment.py \
  --api-url https://mdv-api-production.up.railway.app \
  --web-url https://mdv-web-production.up.railway.app \
  --output validation-results.json \
  --fail-on-error \
  --verbose
```

## Files

### Scripts
- `validate-deployment.py` - Main Python validation script
- `validate-deployment.sh` - Shell wrapper script
- `validation-config.yml` - Configuration file

### Documentation
- `README.md` - This file
- `../docs/deployment/DEPLOYMENT_HEALTH_VALIDATION.md` - Comprehensive documentation

## Features

### Health Checks
- ✅ API service health endpoints
- ✅ Web frontend accessibility
- ✅ Database connectivity
- ✅ CORS configuration
- ✅ Response time monitoring
- ✅ Error rate tracking

### Reporting
- 📊 JSON output format
- 📈 Success rate calculation
- 🚨 Critical issue identification
- ⏱️ Performance metrics
- 📝 Detailed error messages

### Integration
- 🔄 GitHub Actions workflow
- 📢 Slack notifications
- 📧 Email alerts
- 📊 Grafana dashboard
- 🔍 Prometheus metrics

## Environments

### Production
- API: `https://mdv-api-production.up.railway.app`
- Web: `https://mdv-web-production.up.railway.app`

### Staging
- API: `https://mdv-api-staging.up.railway.app`
- Web: `https://mdv-web-staging.up.railway.app`

### Development
- API: `http://localhost:8000`
- Web: `http://localhost:3000`

## Prerequisites

### Python Dependencies
```bash
pip3 install aiohttp pyyaml
```

### System Requirements
- Python 3.7+
- Bash 3.2+ (for shell script)
- curl (for connectivity checks)

## Configuration

### Environment Variables
- `SLACK_WEBHOOK_URL` - Slack notifications
- `PAGERDUTY_INTEGRATION_KEY` - PagerDuty alerts
- `SMTP_SERVER` - Email notifications

### Thresholds
- Response time: < 2000ms (acceptable)
- Availability: > 99.0% (minimum)
- Error rate: < 5.0% (critical)

## CI/CD Integration

The validation system automatically runs:
- After successful deployments
- Every 15 minutes during business hours
- Every hour outside business hours
- On manual trigger

### GitHub Actions
```yaml
# Manual trigger
name: Validate Deployment
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        default: 'production'
```

## Monitoring

### Grafana Dashboard
- Real-time health status
- Performance trends
- Alert integration
- Historical analysis

### Metrics
- `deployment_health_status` - Overall status
- `deployment_health_response_time` - Response times
- `deployment_health_availability` - Service availability
- `deployment_health_checks_total` - Total checks

## Troubleshooting

### Common Issues

#### API Not Reachable
```bash
# Check service status
curl -I https://mdv-api-production.up.railway.app/health

# Check Railway logs
railway logs --service mdv-api
```

#### SSL Certificate Errors
```bash
# Test with insecure flag (debugging only)
curl -k https://your-api.com/health
```

#### Permission Errors
```bash
# Make script executable
chmod +x validate-deployment.sh
```

### Debug Mode
```bash
# Enable verbose output
./validate-deployment.sh --verbose

# Python debug
python3 validate-deployment.py --verbose
```

## Support

For issues or questions:
1. Check the comprehensive documentation
2. Review GitHub Actions logs
3. Contact via Slack `#devops`
4. Create GitHub issue

## Examples

### CI/CD Pipeline
```bash
# In deployment pipeline
./validate-deployment.sh \
  --environment production \
  --fail-on-error \
  --output deployment-validation.json

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Deployment validation passed"
else
  echo "❌ Deployment validation failed"
  exit 1
fi
```

### Monitoring Script
```bash
#!/bin/bash
# monitoring-cron.sh

# Run validation every 5 minutes
while true; do
  ./validate-deployment.sh \
    --environment production \
    --output /tmp/health-check.json
  
  sleep 300
done
```

### Custom Validation
```python
# custom-validation.py
import asyncio
from validate_deployment import DeploymentValidator

async def custom_check():
    config = {
        "api_url": "https://your-api.com",
        "web_url": "https://your-web.com"
    }
    
    async with DeploymentValidator(config) as validator:
        report = await validator.run_validation()
        
    print(f"Status: {report.overall_status}")
    print(f"Success Rate: {report.success_rate():.1f}%")

if __name__ == "__main__":
    asyncio.run(custom_check())
```
