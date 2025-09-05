#!/bin/bash

# Production startup script for MDV Web Frontend
# Handles cache permission issues in Railway deployment

set -e

echo "🚀 Starting MDV Web Frontend..."
echo "Environment: ${NODE_ENV:-development}"
echo "Platform: $(uname -s)"

# Function to check and create cache directory with proper permissions
setup_cache_directory() {
    local cache_dir="/app/.next/cache"
    
    echo "📁 Setting up cache directory..."
    
    # Check if cache directory exists and is writable
    if [ -d "$cache_dir" ]; then
        if [ -w "$cache_dir" ]; then
            echo "✅ Cache directory exists and is writable: $cache_dir"
            return 0
        else
            echo "⚠️  Cache directory exists but is not writable: $cache_dir"
        fi
    else
        echo "📁 Cache directory does not exist: $cache_dir"
    fi
    
    # Try to create/fix cache directory permissions
    echo "🔧 Attempting to fix cache directory permissions..."
    
    # Try to create the directory
    if mkdir -p "$cache_dir" 2>/dev/null; then
        echo "✅ Successfully created cache directory: $cache_dir"
        return 0
    else
        echo "❌ Failed to create cache directory: $cache_dir"
        echo "🔄 Falling back to memory-only caching..."
        export DISABLE_CACHE=true
        return 1
    fi
}

# Function to check available disk space
check_disk_space() {
    echo "💾 Checking disk space..."
    df -h / || echo "⚠️  Could not check disk space"
}

# Function to check memory usage
check_memory() {
    echo "🧠 Checking memory usage..."
    free -h || echo "⚠️  Could not check memory usage"
}

# Function to validate environment
validate_environment() {
    echo "🔍 Validating environment..."
    
    # Check required environment variables
    if [ -z "$NEXT_PUBLIC_API_URL" ] && [ -z "$API_URL" ]; then
        echo "⚠️  Warning: No API URL configured (NEXT_PUBLIC_API_URL or API_URL)"
    else
        echo "✅ API URL configured"
    fi
    
    # Check Node.js version
    echo "📦 Node.js version: $(node --version)"
    echo "📦 NPM version: $(npm --version)"
}

# Main startup sequence
main() {
    echo "=" * 50
    echo "MDV WEB FRONTEND STARTUP"
    echo "=" * 50
    
    validate_environment
    check_disk_space
    check_memory
    
    # Handle cache directory setup
    if ! setup_cache_directory; then
        echo "⚠️  Cache directory setup failed - using memory-only caching"
        export DISABLE_CACHE=true
    fi
    
    # Set additional environment variables for Railway deployment
    export NODE_OPTIONS="--max-old-space-size=512"
    
    echo "🚀 Starting Next.js application..."
    echo "Cache disabled: ${DISABLE_CACHE:-false}"
    echo "Node options: ${NODE_OPTIONS}"
    
    # Start the Next.js application
    exec node server.js
}

# Run main function
main "$@"
