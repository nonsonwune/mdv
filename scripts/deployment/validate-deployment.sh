#!/usr/bin/env bash

# Deployment Health Validation Script for MDV Platform
# This script provides a comprehensive health check for deployed services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
VERBOSE=false
FAIL_ON_ERROR=false
OUTPUT_FILE=""
CONFIG_FILE="$(dirname "$0")/validation-config.yml"
PYTHON_SCRIPT="$(dirname "$0")/validate-deployment.py"

# URLs for different environments
get_api_url() {
    case "$1" in
        "production") echo "https://mdv-api-production.up.railway.app" ;;
        "staging") echo "https://mdv-api-staging.up.railway.app" ;;
        "development") echo "http://localhost:8000" ;;
        *) echo "" ;;
    esac
}

get_web_url() {
    case "$1" in
        "production") echo "https://mdv-web-production.up.railway.app" ;;
        "staging") echo "https://mdv-web-staging.up.railway.app" ;;
        "development") echo "http://localhost:3000" ;;
        *) echo "" ;;
    esac
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
MDV Deployment Health Validation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Environment to validate (production, staging, development)
                            Default: production
    
    -a, --api-url URL       Override API URL
    -w, --web-url URL       Override Web URL
    
    -o, --output FILE       Save results to JSON file
    -c, --config FILE       Use custom configuration file
    
    -v, --verbose           Enable verbose output
    -f, --fail-on-error     Exit with error code if validation fails
    
    --quick                 Run only critical health checks
    --full                  Run comprehensive validation (default)
    
    -h, --help              Show this help message

EXAMPLES:
    # Validate production deployment
    $0 --environment production
    
    # Validate with custom URLs
    $0 --api-url https://api.example.com --web-url https://web.example.com
    
    # Save results and fail on error (for CI/CD)
    $0 --environment production --output results.json --fail-on-error
    
    # Quick health check
    $0 --quick --verbose

ENVIRONMENTS:
    production  - Production deployment on Railway
    staging     - Staging deployment on Railway  
    development - Local development environment

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -a|--api-url)
                API_URL="$2"
                shift 2
                ;;
            -w|--web-url)
                WEB_URL="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -f|--fail-on-error)
                FAIL_ON_ERROR=true
                shift
                ;;
            --quick)
                VALIDATION_TYPE="quick"
                shift
                ;;
            --full)
                VALIDATION_TYPE="full"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    local valid_envs="production staging development"
    if [[ ! " $valid_envs " =~ " $ENVIRONMENT " ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        log_info "Valid environments: $valid_envs"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check if required Python packages are available
    if ! python3 -c "import aiohttp, yaml" 2>/dev/null; then
        log_warning "Required Python packages not found. Installing..."
        pip3 install aiohttp pyyaml || {
            log_error "Failed to install required packages"
            exit 1
        }
    fi
    
    # Check if validation script exists
    if [[ ! -f "$PYTHON_SCRIPT" ]]; then
        log_error "Validation script not found: $PYTHON_SCRIPT"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get service URLs
get_service_urls() {
    # Use provided URLs or defaults for environment
    API_URL="${API_URL:-$(get_api_url "$ENVIRONMENT")}"
    WEB_URL="${WEB_URL:-$(get_web_url "$ENVIRONMENT")}"

    if [[ -z "$API_URL" || -z "$WEB_URL" ]]; then
        log_error "Could not determine URLs for environment: $ENVIRONMENT"
        exit 1
    fi

    log_info "Service URLs:"
    log_info "  API: $API_URL"
    log_info "  Web: $WEB_URL"
}

# Quick connectivity check
quick_connectivity_check() {
    log_info "Performing quick connectivity check..."
    
    # Check API
    if curl -s --max-time 10 "$API_URL/health" > /dev/null; then
        log_success "API is reachable"
    else
        log_error "API is not reachable at $API_URL"
        return 1
    fi
    
    # Check Web
    if curl -s --max-time 10 "$WEB_URL" > /dev/null; then
        log_success "Web frontend is reachable"
    else
        log_error "Web frontend is not reachable at $WEB_URL"
        return 1
    fi
    
    return 0
}

# Run Python validation script
run_validation() {
    log_info "Running comprehensive deployment validation..."
    
    local python_args=(
        "--api-url" "$API_URL"
        "--web-url" "$WEB_URL"
    )
    
    if [[ "$VERBOSE" == "true" ]]; then
        python_args+=("--verbose")
    fi
    
    if [[ "$FAIL_ON_ERROR" == "true" ]]; then
        python_args+=("--fail-on-error")
    fi
    
    if [[ -n "$OUTPUT_FILE" ]]; then
        python_args+=("--output" "$OUTPUT_FILE")
    fi
    
    # Run the Python validation script
    if python3 "$PYTHON_SCRIPT" "${python_args[@]}"; then
        log_success "Deployment validation completed successfully"
        return 0
    else
        log_error "Deployment validation failed"
        return 1
    fi
}

# Generate summary report
generate_summary() {
    if [[ -n "$OUTPUT_FILE" && -f "$OUTPUT_FILE" ]]; then
        log_info "Generating summary report..."
        
        # Extract key metrics from JSON output
        local overall_status=$(python3 -c "import json; data=json.load(open('$OUTPUT_FILE')); print(data['overall_status'])")
        local success_rate=$(python3 -c "import json; data=json.load(open('$OUTPUT_FILE')); print(f\"{data['passed_checks']}/{data['total_checks']} ({data['passed_checks']/data['total_checks']*100:.1f}%)\")")
        
        echo ""
        echo "=========================================="
        echo "DEPLOYMENT VALIDATION SUMMARY"
        echo "=========================================="
        echo "Environment: $ENVIRONMENT"
        echo "Overall Status: $overall_status"
        echo "Success Rate: $success_rate"
        echo "Report saved to: $OUTPUT_FILE"
        echo "=========================================="
    fi
}

# Cleanup function
cleanup() {
    # Clean up any temporary files if needed
    :
}

# Main function
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Parse arguments
    parse_args "$@"
    
    # Validate environment
    validate_environment
    
    # Check prerequisites
    check_prerequisites
    
    # Get service URLs
    get_service_urls
    
    # Quick connectivity check
    if ! quick_connectivity_check; then
        log_error "Quick connectivity check failed"
        if [[ "$FAIL_ON_ERROR" == "true" ]]; then
            exit 1
        fi
    fi
    
    # Run comprehensive validation
    if ! run_validation; then
        log_error "Comprehensive validation failed"
        if [[ "$FAIL_ON_ERROR" == "true" ]]; then
            exit 1
        fi
    fi
    
    # Generate summary
    generate_summary
    
    log_success "Deployment validation completed"
}

# Run main function with all arguments
main "$@"
