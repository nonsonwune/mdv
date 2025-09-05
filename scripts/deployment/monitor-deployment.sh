#!/bin/bash

# MDV Deployment Monitor
# Monitors Railway deployments and provides automated recovery

set -e

# Configuration
MAX_WAIT_TIME=600  # 10 minutes
CHECK_INTERVAL=30  # 30 seconds
RETRY_ATTEMPTS=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Function to check service status
check_service_status() {
    local service_name=$1
    
    log "INFO" "Checking status of $service_name..."
    
    # Get deployment status from Railway
    local status=$(railway status --service "$service_name" --json 2>/dev/null | jq -r '.status // "unknown"')
    
    case $status in
        "SUCCESS"|"RUNNING")
            log "SUCCESS" "$service_name is running successfully"
            return 0
            ;;
        "BUILDING")
            log "INFO" "$service_name is currently building..."
            return 1
            ;;
        "FAILED"|"CRASHED")
            log "ERROR" "$service_name deployment failed"
            return 2
            ;;
        "DEPLOYING")
            log "INFO" "$service_name is deploying..."
            return 1
            ;;
        *)
            log "WARN" "$service_name status unknown: $status"
            return 1
            ;;
    esac
}

# Function to get deployment logs
get_deployment_logs() {
    local service_name=$1
    local lines=${2:-50}
    
    log "INFO" "Fetching last $lines lines of logs for $service_name..."
    railway logs --service "$service_name" | tail -n "$lines"
}

# Function to trigger redeploy
trigger_redeploy() {
    local service_name=$1
    
    log "WARN" "Triggering redeploy for $service_name..."
    railway redeploy --service "$service_name" --yes
    
    if [ $? -eq 0 ]; then
        log "SUCCESS" "Redeploy triggered for $service_name"
        return 0
    else
        log "ERROR" "Failed to trigger redeploy for $service_name"
        return 1
    fi
}

# Function to check service health endpoint
check_health_endpoint() {
    local service_name=$1
    local url=$2
    
    log "INFO" "Checking health endpoint for $service_name: $url"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$response" = "200" ]; then
        log "SUCCESS" "$service_name health check passed (HTTP $response)"
        return 0
    else
        log "ERROR" "$service_name health check failed (HTTP $response)"
        return 1
    fi
}

# Function to monitor deployment
monitor_deployment() {
    local service_name=$1
    local health_url=$2
    local max_wait=${3:-$MAX_WAIT_TIME}
    
    log "INFO" "Starting deployment monitor for $service_name (max wait: ${max_wait}s)"
    
    local start_time=$(date +%s)
    local attempt=1
    
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        log "INFO" "Monitoring attempt $attempt/$RETRY_ATTEMPTS for $service_name"
        
        local wait_time=0
        local deployment_success=false
        
        while [ $wait_time -lt $max_wait ]; do
            check_service_status "$service_name"
            local status_code=$?
            
            case $status_code in
                0)
                    # Service is running, check health endpoint
                    if [ -n "$health_url" ]; then
                        sleep 10  # Wait for service to fully start
                        if check_health_endpoint "$service_name" "$health_url"; then
                            deployment_success=true
                            break
                        else
                            log "WARN" "Service running but health check failed, waiting..."
                        fi
                    else
                        deployment_success=true
                        break
                    fi
                    ;;
                1)
                    # Still building/deploying, continue waiting
                    ;;
                2)
                    # Failed, break and try redeploy
                    log "ERROR" "Deployment failed for $service_name"
                    break
                    ;;
            esac
            
            sleep $CHECK_INTERVAL
            wait_time=$((wait_time + CHECK_INTERVAL))
            
            local elapsed=$(($(date +%s) - start_time))
            log "INFO" "Waiting... (${wait_time}s/${max_wait}s, total elapsed: ${elapsed}s)"
        done
        
        if [ "$deployment_success" = true ]; then
            local total_time=$(($(date +%s) - start_time))
            log "SUCCESS" "$service_name deployed successfully in ${total_time}s"
            return 0
        fi
        
        # If we reach here, deployment failed or timed out
        if [ $attempt -lt $RETRY_ATTEMPTS ]; then
            log "WARN" "Deployment attempt $attempt failed, triggering redeploy..."
            get_deployment_logs "$service_name" 20
            
            if trigger_redeploy "$service_name"; then
                log "INFO" "Waiting 60s before next monitoring attempt..."
                sleep 60
            else
                log "ERROR" "Failed to trigger redeploy, aborting"
                return 1
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "All deployment attempts failed for $service_name"
    get_deployment_logs "$service_name" 50
    return 1
}

# Main function
main() {
    local service=${1:-"mdv-web"}
    local health_url=$2
    
    log "INFO" "MDV Deployment Monitor starting..."
    log "INFO" "Service: $service"
    log "INFO" "Health URL: ${health_url:-"Not specified"}"
    
    # Set default health URLs
    case $service in
        "mdv-web")
            health_url=${health_url:-"https://mdv-web-production.up.railway.app/api/health"}
            ;;
        "mdv-api")
            health_url=${health_url:-"https://mdv-api-production.up.railway.app/health"}
            ;;
        "mdv-worker")
            # Worker doesn't have HTTP health endpoint
            health_url=""
            ;;
    esac
    
    monitor_deployment "$service" "$health_url"
    local result=$?
    
    if [ $result -eq 0 ]; then
        log "SUCCESS" "Deployment monitoring completed successfully"
    else
        log "ERROR" "Deployment monitoring failed"
    fi
    
    return $result
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <service-name> [health-url]"
    echo ""
    echo "Examples:"
    echo "  $0 mdv-web"
    echo "  $0 mdv-api"
    echo "  $0 mdv-worker"
    echo "  $0 mdv-web https://custom-url.com/health"
    exit 1
fi

# Run the monitor
main "$@"
