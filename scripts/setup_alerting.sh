#!/bin/bash

# Automated Alerting Setup Script for MDV Platform
# Sets up Prometheus alerting rules and Alertmanager configuration

set -e

echo "🚨 Setting up MDV Platform Alerting"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "monitoring/alerting/alert-rules.yml" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

# Configuration
PROMETHEUS_CONFIG_DIR=${PROMETHEUS_CONFIG_DIR:-"/etc/prometheus"}
ALERTMANAGER_CONFIG_DIR=${ALERTMANAGER_CONFIG_DIR:-"/etc/alertmanager"}
GRAFANA_CONFIG_DIR=${GRAFANA_CONFIG_DIR:-"/etc/grafana"}

echo "📋 Configuration:"
echo "  Prometheus config: $PROMETHEUS_CONFIG_DIR"
echo "  Alertmanager config: $ALERTMANAGER_CONFIG_DIR"
echo "  Grafana config: $GRAFANA_CONFIG_DIR"
echo ""

# Function to check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        echo "⚠️  This script may need sudo privileges to copy configuration files"
        echo "   You can also copy the files manually to your monitoring setup"
    fi
}

# Function to validate alert rules
validate_alert_rules() {
    echo "🔍 Validating alert rules..."
    
    if command -v promtool &> /dev/null; then
        if promtool check rules monitoring/alerting/alert-rules.yml; then
            echo "✅ Alert rules validation passed"
        else
            echo "❌ Alert rules validation failed"
            exit 1
        fi
    else
        echo "⚠️  promtool not found, skipping validation"
        echo "   Install Prometheus to validate alert rules"
    fi
}

# Function to validate Alertmanager config
validate_alertmanager_config() {
    echo "🔍 Validating Alertmanager configuration..."
    
    if command -v amtool &> /dev/null; then
        if amtool config check monitoring/alerting/alertmanager.yml; then
            echo "✅ Alertmanager configuration validation passed"
        else
            echo "❌ Alertmanager configuration validation failed"
            exit 1
        fi
    else
        echo "⚠️  amtool not found, skipping validation"
        echo "   Install Alertmanager to validate configuration"
    fi
}

# Function to setup Prometheus alert rules
setup_prometheus_rules() {
    echo "📝 Setting up Prometheus alert rules..."
    
    # Create rules directory if it doesn't exist
    if [ -w "$PROMETHEUS_CONFIG_DIR" ] || [ "$EUID" -eq 0 ]; then
        mkdir -p "$PROMETHEUS_CONFIG_DIR/rules"
        cp monitoring/alerting/alert-rules.yml "$PROMETHEUS_CONFIG_DIR/rules/mdv-alerts.yml"
        echo "✅ Alert rules copied to $PROMETHEUS_CONFIG_DIR/rules/mdv-alerts.yml"
    else
        echo "📋 Manual step required:"
        echo "   Copy monitoring/alerting/alert-rules.yml to $PROMETHEUS_CONFIG_DIR/rules/mdv-alerts.yml"
    fi
    
    echo ""
    echo "📝 Add this to your prometheus.yml configuration:"
    echo ""
    cat << 'EOF'
rule_files:
  - "rules/mdv-alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
    echo ""
}

# Function to setup Alertmanager
setup_alertmanager() {
    echo "📝 Setting up Alertmanager configuration..."
    
    if [ -w "$ALERTMANAGER_CONFIG_DIR" ] || [ "$EUID" -eq 0 ]; then
        cp monitoring/alerting/alertmanager.yml "$ALERTMANAGER_CONFIG_DIR/alertmanager.yml"
        echo "✅ Alertmanager config copied to $ALERTMANAGER_CONFIG_DIR/alertmanager.yml"
    else
        echo "📋 Manual step required:"
        echo "   Copy monitoring/alerting/alertmanager.yml to $ALERTMANAGER_CONFIG_DIR/alertmanager.yml"
    fi
    
    echo ""
    echo "⚠️  Remember to update the following in alertmanager.yml:"
    echo "   - Slack webhook URLs"
    echo "   - PagerDuty integration key"
    echo "   - Email SMTP settings"
    echo "   - Team notification channels"
    echo ""
}

# Function to create notification templates
create_notification_templates() {
    echo "📝 Creating notification templates..."
    
    mkdir -p monitoring/alerting/templates
    
    cat > monitoring/alerting/templates/slack.tmpl << 'EOF'
{{ define "slack.mdv.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.SortedPairs.Values | join " " }} {{ if gt (len .CommonLabels) (len .GroupLabels) }}({{ with .CommonLabels.Remove .GroupLabels.Names }}{{ .Values | join " " }}{{ end }}){{ end }}
{{ end }}

{{ define "slack.mdv.text" }}
{{ range .Alerts }}
*Alert:* {{ .Annotations.summary }}
*Description:* {{ .Annotations.description }}
*Service:* {{ .Labels.service }}
*Severity:* {{ .Labels.severity }}
{{ if .Annotations.runbook_url }}*Runbook:* {{ .Annotations.runbook_url }}{{ end }}
*Started:* {{ .StartsAt.Format "2006-01-02 15:04:05 UTC" }}
{{ end }}
{{ end }}
EOF
    
    echo "✅ Notification templates created"
}

# Function to setup Grafana alerting
setup_grafana_alerting() {
    echo "📝 Setting up Grafana alerting integration..."
    
    echo "📋 Manual steps for Grafana:"
    echo "1. Go to Grafana > Alerting > Notification channels"
    echo "2. Add Slack notification channel with webhook URL"
    echo "3. Add PagerDuty notification channel with integration key"
    echo "4. Import dashboard alert rules from monitoring/grafana/dashboards/"
    echo "5. Configure alert rules for dashboard panels"
    echo ""
}

# Function to test alerting setup
test_alerting() {
    echo "🧪 Testing alerting setup..."
    
    if command -v curl &> /dev/null; then
        echo "Testing health check endpoint..."
        if curl -s http://localhost:8000/health > /dev/null; then
            echo "✅ API health check accessible"
        else
            echo "⚠️  API health check not accessible (this is expected if API is not running)"
        fi
    fi
    
    echo ""
    echo "🧪 To test alerts manually:"
    echo "1. Stop the API service to trigger APIDown alert"
    echo "2. Generate high load to trigger HighResponseTime alert"
    echo "3. Check Alertmanager web UI at http://localhost:9093"
    echo "4. Check Prometheus alerts at http://localhost:9090/alerts"
    echo ""
}

# Function to display next steps
show_next_steps() {
    echo "🎯 Next Steps:"
    echo "============="
    echo ""
    echo "1. 📧 Configure notification channels:"
    echo "   - Update Slack webhook URLs in alertmanager.yml"
    echo "   - Set up PagerDuty integration key"
    echo "   - Configure email SMTP settings"
    echo ""
    echo "2. 🔧 Restart monitoring services:"
    echo "   - sudo systemctl restart prometheus"
    echo "   - sudo systemctl restart alertmanager"
    echo "   - sudo systemctl restart grafana-server"
    echo ""
    echo "3. 🧪 Test alerting:"
    echo "   - Trigger test alerts to verify notifications"
    echo "   - Check alert routing and escalation"
    echo "   - Verify runbook links are accessible"
    echo ""
    echo "4. 📊 Monitor alert effectiveness:"
    echo "   - Review alert frequency and accuracy"
    echo "   - Adjust thresholds based on baseline metrics"
    echo "   - Update escalation policies as needed"
    echo ""
    echo "5. 📚 Create runbooks:"
    echo "   - Document incident response procedures"
    echo "   - Create troubleshooting guides"
    echo "   - Train team on alert handling"
    echo ""
}

# Main execution
main() {
    check_permissions
    echo ""
    
    validate_alert_rules
    echo ""
    
    validate_alertmanager_config
    echo ""
    
    setup_prometheus_rules
    echo ""
    
    setup_alertmanager
    echo ""
    
    create_notification_templates
    echo ""
    
    setup_grafana_alerting
    echo ""
    
    test_alerting
    echo ""
    
    show_next_steps
    
    echo "✅ Alerting setup completed!"
    echo ""
    echo "📖 For detailed configuration, see:"
    echo "   docs/devops/monitoring-setup.md"
}

# Run main function
main "$@"
