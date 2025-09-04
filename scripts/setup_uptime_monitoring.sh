#!/bin/bash

# Uptime Monitoring Setup Script for MDV Platform
# Sets up external uptime monitoring and status page

set -e

echo "📊 Setting up MDV Uptime Monitoring"
echo "==================================="

# Check if we're in the right directory
if [ ! -f "monitoring/uptime/uptime-config.yml" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

# Configuration
DOMAIN=${DOMAIN:-"mdv.com"}
API_URL=${API_URL:-"https://mdv-api-production.up.railway.app"}
WEB_URL=${WEB_URL:-"https://mdv-web-production.up.railway.app"}

echo "📋 Configuration:"
echo "  Domain: $DOMAIN"
echo "  API URL: $API_URL"
echo "  Web URL: $WEB_URL"
echo ""

# Function to check dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is required but not installed"
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        echo "❌ pip3 is required but not installed"
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Function to install Python dependencies
install_python_deps() {
    echo "📦 Installing Python dependencies..."
    
    # Create requirements file for uptime monitoring
    cat > monitoring/uptime/requirements.txt << EOF
aiohttp>=3.8.0
PyYAML>=6.0
asyncio
smtplib
email
pathlib
EOF
    
    # Install dependencies
    pip3 install -r monitoring/uptime/requirements.txt
    
    echo "✅ Python dependencies installed"
}

# Function to configure uptime monitoring
configure_monitoring() {
    echo "⚙️  Configuring uptime monitoring..."
    
    # Update configuration with actual URLs
    sed -i.bak "s|https://mdv-api-production.up.railway.app|$API_URL|g" monitoring/uptime/uptime-config.yml
    sed -i.bak "s|https://mdv-web-production.up.railway.app|$WEB_URL|g" monitoring/uptime/uptime-config.yml
    
    # Make monitoring script executable
    chmod +x monitoring/uptime/uptime_monitor.py
    
    echo "✅ Monitoring configuration updated"
}

# Function to test monitoring
test_monitoring() {
    echo "🧪 Testing uptime monitoring..."
    
    # Run a test check
    cd monitoring/uptime
    if python3 uptime_monitor.py; then
        echo "✅ Uptime monitoring test passed"
    else
        echo "⚠️  Uptime monitoring test failed (this may be expected if services are not running)"
    fi
    cd ../..
}

# Function to setup status page
setup_status_page() {
    echo "📄 Setting up status page..."
    
    # Create status page directory
    mkdir -p public/status
    
    # Copy status page files
    cp monitoring/status-page/index.html public/status/
    
    # Update status page with correct API URL
    sed -i.bak "s|window.location.origin|'$API_URL'|g" public/status/index.html
    
    echo "✅ Status page setup completed"
    echo "   Access at: $WEB_URL/status"
}

# Function to create systemd service (for Linux servers)
create_systemd_service() {
    echo "🔧 Creating systemd service..."
    
    cat > monitoring/uptime/mdv-uptime-monitor.service << EOF
[Unit]
Description=MDV Uptime Monitor
After=network.target

[Service]
Type=simple
User=mdv
WorkingDirectory=/opt/mdv
ExecStart=/usr/bin/python3 /opt/mdv/monitoring/uptime/uptime_monitor.py
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF
    
    echo "📋 Systemd service created at monitoring/uptime/mdv-uptime-monitor.service"
    echo "   To install:"
    echo "   sudo cp monitoring/uptime/mdv-uptime-monitor.service /etc/systemd/system/"
    echo "   sudo systemctl enable mdv-uptime-monitor"
    echo "   sudo systemctl start mdv-uptime-monitor"
}

# Function to create cron job
create_cron_job() {
    echo "⏰ Creating cron job for uptime monitoring..."
    
    cat > monitoring/uptime/crontab << EOF
# MDV Uptime Monitoring
# Run every 5 minutes
*/5 * * * * cd /opt/mdv && python3 monitoring/uptime/uptime_monitor.py >> /var/log/mdv-uptime.log 2>&1

# Generate daily report at 9 AM
0 9 * * * cd /opt/mdv && python3 monitoring/uptime/uptime_monitor.py --report daily >> /var/log/mdv-uptime.log 2>&1

# Generate weekly report on Mondays at 9 AM
0 9 * * 1 cd /opt/mdv && python3 monitoring/uptime/uptime_monitor.py --report weekly >> /var/log/mdv-uptime.log 2>&1
EOF
    
    echo "📋 Cron job configuration created at monitoring/uptime/crontab"
    echo "   To install: crontab monitoring/uptime/crontab"
}

# Function to setup external monitoring services
setup_external_monitoring() {
    echo "🌐 Setting up external monitoring services..."
    
    echo "📋 Manual setup required for external services:"
    echo ""
    echo "1. UptimeRobot (https://uptimerobot.com):"
    echo "   - Create monitors for:"
    echo "     * $API_URL/health (every 5 minutes)"
    echo "     * $API_URL/health/ready (every 5 minutes)"
    echo "     * $WEB_URL/ (every 5 minutes)"
    echo "     * $API_URL/api/products (every 10 minutes)"
    echo ""
    echo "2. Pingdom (https://pingdom.com):"
    echo "   - Setup performance monitoring"
    echo "   - Configure multi-location checks"
    echo ""
    echo "3. StatusPage.io (https://statuspage.io):"
    echo "   - Create status page"
    echo "   - Configure components and metrics"
    echo "   - Set up incident management"
    echo ""
    echo "4. Configure notification channels:"
    echo "   - Email: alerts@$DOMAIN"
    echo "   - Slack: #alerts channel"
    echo "   - PagerDuty: for critical alerts"
    echo ""
}

# Function to create monitoring dashboard
create_monitoring_dashboard() {
    echo "📊 Creating monitoring dashboard..."
    
    # Create a simple dashboard HTML
    cat > monitoring/uptime/dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>MDV Uptime Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .status-up { background-color: #d4edda; }
        .status-down { background-color: #f8d7da; }
        .status-degraded { background-color: #fff3cd; }
    </style>
</head>
<body>
    <h1>MDV Platform Uptime Dashboard</h1>
    <div id="metrics"></div>
    <script>
        // Simple dashboard that fetches uptime data
        async function loadMetrics() {
            try {
                const response = await fetch('/health/detailed');
                const data = await response.json();
                displayMetrics(data);
            } catch (error) {
                console.error('Failed to load metrics:', error);
            }
        }
        
        function displayMetrics(data) {
            const metricsDiv = document.getElementById('metrics');
            metricsDiv.innerHTML = `
                <div class="metric status-${data.status}">
                    <h3>Overall Status</h3>
                    <p>${data.status}</p>
                </div>
                <div class="metric">
                    <h3>Uptime</h3>
                    <p>${data.uptime_seconds ? Math.round(data.uptime_seconds / 3600) : 'N/A'} hours</p>
                </div>
                <div class="metric">
                    <h3>Response Time</h3>
                    <p>${data.metrics?.requests?.avg_response_time ? Math.round(data.metrics.requests.avg_response_time * 1000) : 'N/A'}ms</p>
                </div>
            `;
        }
        
        loadMetrics();
        setInterval(loadMetrics, 60000); // Refresh every minute
    </script>
</body>
</html>
EOF
    
    echo "✅ Monitoring dashboard created at monitoring/uptime/dashboard.html"
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎯 Next Steps:"
    echo "============="
    echo ""
    echo "1. 📧 Configure notification settings:"
    echo "   - Update email settings in monitoring/uptime/uptime-config.yml"
    echo "   - Set up Slack webhook URL"
    echo "   - Configure PagerDuty integration key"
    echo ""
    echo "2. 🔄 Set up automated monitoring:"
    echo "   - Install cron job: crontab monitoring/uptime/crontab"
    echo "   - Or install systemd service (Linux servers)"
    echo ""
    echo "3. 🌐 Configure external monitoring:"
    echo "   - Set up UptimeRobot monitors"
    echo "   - Configure Pingdom checks"
    echo "   - Create StatusPage.io status page"
    echo ""
    echo "4. 📊 Deploy status page:"
    echo "   - Host public/status/index.html on your web server"
    echo "   - Configure DNS for status.$DOMAIN"
    echo ""
    echo "5. 🧪 Test monitoring:"
    echo "   - Run: python3 monitoring/uptime/uptime_monitor.py"
    echo "   - Verify alerts are working"
    echo "   - Test status page functionality"
    echo ""
    echo "📖 For detailed configuration, see:"
    echo "   docs/devops/monitoring-setup.md"
}

# Main execution
main() {
    check_dependencies
    echo ""
    
    install_python_deps
    echo ""
    
    configure_monitoring
    echo ""
    
    test_monitoring
    echo ""
    
    setup_status_page
    echo ""
    
    create_systemd_service
    echo ""
    
    create_cron_job
    echo ""
    
    setup_external_monitoring
    echo ""
    
    create_monitoring_dashboard
    echo ""
    
    show_next_steps
    
    echo "✅ Uptime monitoring setup completed!"
}

# Run main function
main "$@"
