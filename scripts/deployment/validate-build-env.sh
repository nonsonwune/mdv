#!/bin/bash

# Build Environment Validation Script for MDV Web Service
# Validates that all required environment variables are set for successful builds

set -e

echo "🔍 MDV Web Build Environment Validation"
echo "========================================"

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local description=$2
    local required=${3:-true}
    
    if [ -n "${!var_name}" ]; then
        echo "✅ $description: $var_name=${!var_name}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo "❌ $description: $var_name (REQUIRED - NOT SET)"
            return 1
        else
            echo "⚠️  $description: $var_name (OPTIONAL - NOT SET)"
            return 0
        fi
    fi
}

# Function to validate URL format
validate_url() {
    local url=$1
    local description=$2
    
    if [[ $url =~ ^https?:// ]]; then
        echo "✅ $description URL format: Valid"
        return 0
    else
        echo "❌ $description URL format: Invalid (must start with http:// or https://)"
        return 1
    fi
}

# Function to test URL accessibility
test_url_accessibility() {
    local url=$1
    local description=$2
    local timeout=${3:-10}
    
    echo "🌐 Testing $description accessibility..."
    
    if curl -s --max-time "$timeout" --head "$url" > /dev/null 2>&1; then
        echo "✅ $description: Accessible"
        return 0
    else
        echo "⚠️  $description: Not accessible (may be expected during build)"
        return 0  # Don't fail build for accessibility issues
    fi
}

# Main validation
main() {
    local failed_checks=0
    
    echo "📋 Required Environment Variables:"
    check_env_var "NEXT_PUBLIC_API_URL" "API URL" true || ((failed_checks++))
    check_env_var "NEXT_PUBLIC_APP_URL" "App URL" true || ((failed_checks++))
    
    echo ""
    echo "📋 Optional Environment Variables:"
    check_env_var "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" "Paystack Public Key" false
    check_env_var "ALLOW_MOCKS" "Allow Mocks" false
    check_env_var "NEXT_PUBLIC_ALLOW_MOCKS" "Public Allow Mocks" false
    check_env_var "NODE_ENV" "Node Environment" false
    check_env_var "NODE_OPTIONS" "Node Options" false
    
    echo ""
    echo "🔗 URL Format Validation:"
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        validate_url "$NEXT_PUBLIC_API_URL" "API" || ((failed_checks++))
    fi
    
    if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
        validate_url "$NEXT_PUBLIC_APP_URL" "App" || ((failed_checks++))
    fi
    
    echo ""
    echo "🌐 URL Accessibility Tests:"
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        test_url_accessibility "$NEXT_PUBLIC_API_URL/health" "API Health Endpoint"
    fi
    
    echo ""
    echo "📦 Build Environment Info:"
    echo "   Node.js Version: $(node --version 2>/dev/null || echo 'Not available')"
    echo "   NPM Version: $(npm --version 2>/dev/null || echo 'Not available')"
    echo "   Working Directory: $(pwd)"
    echo "   Available Memory: $(free -h 2>/dev/null | awk 'NR==2{print $7}' || echo 'Not available')"
    echo "   Available Disk: $(df -h . 2>/dev/null | awk 'NR==2{print $4}' || echo 'Not available')"
    
    echo ""
    echo "🔧 Railway-Specific Checks:"
    check_env_var "RAILWAY_ENVIRONMENT" "Railway Environment" false
    check_env_var "RAILWAY_PROJECT_ID" "Railway Project ID" false
    check_env_var "RAILWAY_SERVICE_ID" "Railway Service ID" false
    
    echo ""
    echo "📊 Build Environment Summary:"
    echo "============================="
    
    if [ $failed_checks -eq 0 ]; then
        echo "🎉 All critical checks passed! Build environment is ready."
        echo "💡 Recommended: Proceed with build"
        
        # Set default values for missing optional variables
        export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://mdv-api-production.up.railway.app"}
        export NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-"https://mdv-web-production.up.railway.app"}
        export NODE_ENV=${NODE_ENV:-"production"}
        
        echo ""
        echo "🔧 Environment Variables Set:"
        echo "   NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
        echo "   NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL"
        echo "   NODE_ENV=$NODE_ENV"
        
        exit 0
    else
        echo "⚠️  $failed_checks critical check(s) failed"
        echo "🚨 Build may fail - address issues before proceeding"
        echo ""
        echo "🔧 Common Solutions:"
        echo "   - Set missing environment variables in Railway dashboard"
        echo "   - Verify URL formats are correct (must include https://)"
        echo "   - Check Railway service configuration"
        echo "   - Ensure build args are properly configured in railway.json"
        echo ""
        echo "🔍 Debugging Commands:"
        echo "   railway variables list"
        echo "   railway logs --service mdv-web"
        echo "   railway status"
        
        exit 1
    fi
}

# Show usage if help requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Validates build environment for MDV web service deployment."
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Environment Variables Checked:"
    echo "  NEXT_PUBLIC_API_URL          (required) - Backend API URL"
    echo "  NEXT_PUBLIC_APP_URL          (required) - Frontend app URL"
    echo "  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (optional) - Paystack public key"
    echo "  ALLOW_MOCKS                  (optional) - Enable mock data"
    echo "  NODE_ENV                     (optional) - Node environment"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run validation"
    echo "  NEXT_PUBLIC_API_URL=https://api.example.com $0  # With custom API URL"
    exit 0
fi

# Run the validation
main "$@"
