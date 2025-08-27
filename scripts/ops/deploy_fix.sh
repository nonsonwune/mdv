#!/bin/bash

# Quick deployment fix script for MDV Backend
# This script applies the production fixes and redeploys

set -e

echo "=== MDV Backend Production Fix Deployment ==="
echo "Timestamp: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "1. VALIDATING FILES"
echo "=================="

# Check if required files exist
files_to_check=(
    "start_production.py"
    "Procfile"
    "railway.json"
    "diagnose_deployment.sh"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        log_success "$file exists"
    else
        log_warning "$file missing - this may cause deployment issues"
    fi
done

echo ""
echo "2. COMMITTING CHANGES"
echo "===================="

# Add and commit the new files
git add start_production.py Procfile railway.json diagnose_deployment.sh ../PRODUCTION_FIX.md
git commit -m "feat: add production deployment fixes

- Add robust start_production.py with health checks
- Add Procfile and railway.json for deployment config  
- Add deployment diagnosis script
- Add comprehensive fix documentation

Fixes 502 Bad Gateway errors in production by:
- Validating environment variables before startup
- Testing database connectivity
- Checking module imports
- Providing detailed error logging
- Graceful failure handling

This resolves the backend service crashes causing CORS
and API connectivity issues in production."

log_success "Changes committed to git"

echo ""
echo "3. DEPLOYMENT INSTRUCTIONS"
echo "========================="

log_info "The fixes are ready! To deploy:"
echo ""
echo "Option 1 - Using Railway CLI (if available):"
echo "  railway up --service mdv-api"
echo ""
echo "Option 2 - Git push (if Railway is connected to git):"
echo "  git push origin main"
echo ""
echo "Option 3 - Manual Railway Dashboard:"
echo "  1. Go to Railway dashboard"
echo "  2. Select mdv-api service"
echo "  3. Click 'Deploy' or trigger redeploy"
echo ""

echo "4. ENVIRONMENT VARIABLES CHECK"
echo "============================="

log_info "Ensure these environment variables are set in Railway:"
echo "  ✓ DATABASE_URL (required)"
echo "  ✓ JWT_SECRET_KEY (required)"  
echo "  - PAYSTACK_SECRET_KEY (optional)"
echo "  - APP_URL=https://mdv-web-production.up.railway.app (optional)"
echo "  - ENV=production (optional)"
echo ""

echo "5. POST-DEPLOYMENT VERIFICATION"
echo "==============================="

log_info "After deployment, run the diagnosis script:"
echo "  ./diagnose_deployment.sh"
echo ""
log_info "Expected results:"
echo "  ✓ Health Check endpoint: HTTP 200"
echo "  ✓ API Test endpoint: HTTP 200"
echo "  ✓ CORS headers present"
echo "  ✓ Auth endpoints return HTTP 422 (not 502)"
echo ""

echo "6. TROUBLESHOOTING"
echo "=================="

log_info "If issues persist after deployment:"
echo "  1. Check Railway logs: railway logs --service mdv-api"
echo "  2. Verify environment variables: railway variables --service mdv-api"
echo "  3. Test health endpoint: curl https://mdv-api-production.up.railway.app/health"
echo "  4. Run diagnosis script: ./diagnose_deployment.sh"
echo ""

log_success "Production fix deployment prepared successfully!"
log_info "Ready to deploy to Railway platform."

echo ""
echo "=== Summary ==="
echo "✅ Created robust production startup script"
echo "✅ Added deployment configuration files"  
echo "✅ Added diagnostic tools"
echo "✅ Committed changes to git"
echo "🚀 Ready for deployment to Railway"
echo ""
echo "Next step: Deploy to Railway using one of the methods above"
