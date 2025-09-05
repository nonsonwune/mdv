#!/bin/bash

# Pre-Build Validation Script for MDV Web Service
# Validates environment and dependencies before Docker build starts

set -e

echo "🔍 MDV Web Pre-Build Validation"
echo "================================"
echo "Timestamp: $(date)"
echo "Build Environment: ${NODE_ENV:-development}"
echo "Railway Environment: ${RAILWAY_ENVIRONMENT:-unknown}"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check critical environment variables
validate_env_vars() {
    log "📋 Validating Environment Variables"
    
    local failed=0
    
    # Critical build-time variables
    if [ -z "$NEXT_PUBLIC_API_URL" ]; then
        echo "❌ NEXT_PUBLIC_API_URL is not set"
        failed=1
    else
        echo "✅ NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
    fi
    
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        echo "❌ NEXT_PUBLIC_APP_URL is not set"
        failed=1
    else
        echo "✅ NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
    fi
    
    # Optional variables
    echo "ℹ️  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: ${NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:-'(not set)'}"
    echo "ℹ️  NODE_ENV: ${NODE_ENV:-'(not set)'}"
    echo "ℹ️  RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-'(not set)'}"
    
    return $failed
}

# Function to validate file structure
validate_file_structure() {
    log "📁 Validating File Structure"
    
    local failed=0
    
    # Critical files
    if [ ! -f "web/package.json" ]; then
        echo "❌ web/package.json not found"
        failed=1
    else
        echo "✅ web/package.json exists"
    fi
    
    if [ ! -f "web/package-lock.json" ]; then
        echo "❌ web/package-lock.json not found"
        failed=1
    else
        echo "✅ web/package-lock.json exists"
    fi
    
    if [ ! -f "docs/api-contracts.yaml" ]; then
        echo "❌ docs/api-contracts.yaml not found"
        failed=1
    else
        echo "✅ docs/api-contracts.yaml exists"
    fi
    
    if [ ! -f "Dockerfile.web" ]; then
        echo "❌ Dockerfile.web not found"
        failed=1
    else
        echo "✅ Dockerfile.web exists"
    fi
    
    # Check web directory structure
    if [ ! -d "web/app" ]; then
        echo "❌ web/app directory not found"
        failed=1
    else
        echo "✅ web/app directory exists"
    fi
    
    return $failed
}

# Function to validate package.json scripts
validate_package_scripts() {
    log "📦 Validating Package Scripts"
    
    if [ ! -f "web/package.json" ]; then
        echo "❌ Cannot validate scripts - package.json missing"
        return 1
    fi
    
    # Check for required scripts
    if ! grep -q '"build"' web/package.json; then
        echo "❌ Build script not found in package.json"
        return 1
    else
        echo "✅ Build script found"
    fi
    
    if ! grep -q '"types:api"' web/package.json; then
        echo "❌ types:api script not found in package.json"
        return 1
    else
        echo "✅ types:api script found"
    fi
    
    return 0
}

# Function to check system resources
check_system_resources() {
    log "💾 Checking System Resources"
    
    # Memory check (if available)
    if command -v free >/dev/null 2>&1; then
        local mem_available=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        echo "📊 Available Memory: ${mem_available}MB"
        
        if [ "$mem_available" -lt 512 ]; then
            echo "⚠️  Low memory warning: Less than 512MB available"
        fi
    else
        echo "ℹ️  Memory check not available on this platform"
    fi
    
    # Disk space check
    local disk_available=$(df . | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
    echo "📊 Available Disk Space: ${disk_available}GB"
    
    if (( $(echo "$disk_available < 1.0" | bc -l 2>/dev/null || echo "0") )); then
        echo "⚠️  Low disk space warning: Less than 1GB available"
    fi
}

# Function to validate API contracts
validate_api_contracts() {
    log "🔗 Validating API Contracts"
    
    if [ ! -f "docs/api-contracts.yaml" ]; then
        echo "❌ API contracts file missing"
        return 1
    fi
    
    # Check file size (should not be empty)
    local file_size=$(wc -c < "docs/api-contracts.yaml")
    if [ "$file_size" -lt 100 ]; then
        echo "❌ API contracts file appears to be empty or too small"
        return 1
    else
        echo "✅ API contracts file has content (${file_size} bytes)"
    fi
    
    # Basic YAML validation (if yq is available)
    if command -v yq >/dev/null 2>&1; then
        if yq eval '.' docs/api-contracts.yaml >/dev/null 2>&1; then
            echo "✅ API contracts YAML is valid"
        else
            echo "❌ API contracts YAML is invalid"
            return 1
        fi
    else
        echo "ℹ️  YAML validation skipped (yq not available)"
    fi
    
    return 0
}

# Function to create build report
create_build_report() {
    log "📊 Creating Build Report"
    
    local report_file="build-validation-report.txt"
    
    cat > "$report_file" << EOF
MDV Web Build Validation Report
===============================
Timestamp: $(date)
Build Environment: ${NODE_ENV:-development}
Railway Environment: ${RAILWAY_ENVIRONMENT:-unknown}

Environment Variables:
- NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-'(not set)'}
- NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-'(not set)'}
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: ${NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:-'(not set)'}
- NODE_ENV: ${NODE_ENV:-'(not set)'}
- RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-'(not set)'}

System Information:
- Node.js Version: $(node --version 2>/dev/null || echo 'Not available')
- NPM Version: $(npm --version 2>/dev/null || echo 'Not available')
- Working Directory: $(pwd)
- Available Disk Space: $(df . | awk 'NR==2 {printf "%.1f", $4/1024/1024}')GB

File Structure:
- web/package.json: $([ -f "web/package.json" ] && echo "✅" || echo "❌")
- web/package-lock.json: $([ -f "web/package-lock.json" ] && echo "✅" || echo "❌")
- docs/api-contracts.yaml: $([ -f "docs/api-contracts.yaml" ] && echo "✅" || echo "❌")
- Dockerfile.web: $([ -f "Dockerfile.web" ] && echo "✅" || echo "❌")
- web/app directory: $([ -d "web/app" ] && echo "✅" || echo "❌")

Validation Status: $([ $? -eq 0 ] && echo "PASSED" || echo "FAILED")
EOF
    
    echo "📄 Build report saved to: $report_file"
}

# Main validation function
main() {
    local total_failures=0
    
    echo "🚀 Starting Pre-Build Validation..."
    echo ""
    
    # Run all validations
    validate_env_vars || total_failures=$((total_failures + 1))
    echo ""
    
    validate_file_structure || total_failures=$((total_failures + 1))
    echo ""
    
    validate_package_scripts || total_failures=$((total_failures + 1))
    echo ""
    
    check_system_resources
    echo ""
    
    validate_api_contracts || total_failures=$((total_failures + 1))
    echo ""
    
    # Create build report
    create_build_report
    echo ""
    
    # Final summary
    log "📊 Validation Summary"
    echo "===================="
    
    if [ $total_failures -eq 0 ]; then
        echo "🎉 All validations passed! Build can proceed."
        echo "✅ Environment: Ready"
        echo "✅ File Structure: Valid"
        echo "✅ Dependencies: Available"
        echo "✅ API Contracts: Valid"
        echo ""
        echo "💡 Recommendation: Proceed with Docker build"
        exit 0
    else
        echo "❌ $total_failures validation(s) failed!"
        echo "🚨 Build may fail - address issues before proceeding"
        echo ""
        echo "🔧 Common Solutions:"
        echo "   - Set missing environment variables in Railway dashboard"
        echo "   - Ensure all required files are committed to git"
        echo "   - Verify API contracts file is valid and up-to-date"
        echo "   - Check package.json for required scripts"
        exit 1
    fi
}

# Run validation
main "$@"
