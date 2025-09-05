#!/bin/bash

# Build Health Check Script for MDV Web Service
# Validates build prerequisites and environment before deployment

set -e

echo "🔍 MDV Web Build Health Check"
echo "=============================="

# Function to check file existence
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo "✅ $description: $file"
        return 0
    else
        echo "❌ $description: $file (MISSING)"
        return 1
    fi
}

# Function to check directory
check_directory() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        echo "✅ $description: $dir"
        return 0
    else
        echo "❌ $description: $dir (MISSING)"
        return 1
    fi
}

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local description=$2
    
    if [ -n "${!var_name}" ]; then
        echo "✅ $description: $var_name=${!var_name}"
        return 0
    else
        echo "⚠️  $description: $var_name (NOT SET)"
        return 1
    fi
}

# Function to check memory availability
check_memory() {
    echo "💾 Memory Check:"
    
    # Check available memory (Linux)
    if command -v free >/dev/null 2>&1; then
        local available_mb=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        echo "   Available Memory: ${available_mb}MB"
        
        if [ "$available_mb" -lt 1024 ]; then
            echo "⚠️  Low memory warning: Less than 1GB available"
            return 1
        else
            echo "✅ Memory: Sufficient (${available_mb}MB available)"
            return 0
        fi
    else
        echo "ℹ️  Memory check not available on this platform"
        return 0
    fi
}

# Function to check disk space
check_disk_space() {
    echo "💿 Disk Space Check:"
    
    local available_gb=$(df . | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
    echo "   Available Disk Space: ${available_gb}GB"
    
    if (( $(echo "$available_gb < 2.0" | bc -l) )); then
        echo "⚠️  Low disk space warning: Less than 2GB available"
        return 1
    else
        echo "✅ Disk Space: Sufficient (${available_gb}GB available)"
        return 0
    fi
}

# Main health check
main() {
    local failed_checks=0
    
    echo "📁 File System Checks:"
    check_file "web/package.json" "Package Configuration" || ((failed_checks++))
    check_file "web/package-lock.json" "Package Lock" || ((failed_checks++))
    check_file "docs/api-contracts.yaml" "API Contracts" || ((failed_checks++))
    check_file "Dockerfile.web" "Web Dockerfile" || ((failed_checks++))
    check_directory "web/app" "Next.js App Directory" || ((failed_checks++))
    check_directory "web/lib" "Web Libraries" || ((failed_checks++))
    
    echo ""
    echo "🌍 Environment Variables:"
    check_env_var "NEXT_PUBLIC_API_URL" "API URL"
    check_env_var "NEXT_PUBLIC_APP_URL" "App URL"
    check_env_var "NODE_ENV" "Node Environment"
    
    echo ""
    echo "🔧 System Resources:"
    check_memory || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    
    echo ""
    echo "📦 Node.js Environment:"
    if command -v node >/dev/null 2>&1; then
        echo "✅ Node.js Version: $(node --version)"
    else
        echo "❌ Node.js not found"
        ((failed_checks++))
    fi
    
    if command -v npm >/dev/null 2>&1; then
        echo "✅ NPM Version: $(npm --version)"
    else
        echo "❌ NPM not found"
        ((failed_checks++))
    fi
    
    echo ""
    echo "📊 Build Health Summary:"
    echo "========================"
    
    if [ $failed_checks -eq 0 ]; then
        echo "🎉 All checks passed! Build should succeed."
        echo "💡 Recommended: Proceed with deployment"
        exit 0
    else
        echo "⚠️  $failed_checks check(s) failed"
        echo "🚨 Build may fail - address issues before deployment"
        echo ""
        echo "🔧 Common Solutions:"
        echo "   - Ensure all required files are committed to git"
        echo "   - Set missing environment variables in Railway"
        echo "   - Increase memory/CPU limits in railway.json"
        echo "   - Check for sufficient disk space"
        exit 1
    fi
}

# Run the health check
main "$@"
