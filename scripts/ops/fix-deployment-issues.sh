#!/bin/bash

# MDV Railway Deployment Fix Script
# This script addresses the critical issues found in the deployment

set -e

echo "=========================================="
echo "MDV Railway Deployment Fix Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Fix database migration issue
echo "Step 1: Fixing Database Migration Issue"
echo "----------------------------------------"

print_warning "The database is looking for a revision 'add_category_cloudinary' that doesn't exist."
print_status "Creating SQL script to fix the migration state..."

cat > fix_migration.sql << 'EOF'
-- Check current migration state
SELECT version_num FROM alembic_version;

-- If the version_num shows 'add_category_cloudinary', update it:
-- This will set it to the last valid migration before the problematic one
UPDATE alembic_version 
SET version_num = 'c2d8e9f3a1b5' 
WHERE version_num = 'add_category_cloudinary';

-- If no rows exist in alembic_version, insert the current head
INSERT INTO alembic_version (version_num) 
SELECT 'c2d8e9f3a1b5'
WHERE NOT EXISTS (SELECT 1 FROM alembic_version);

-- Verify the change
SELECT version_num FROM alembic_version;
EOF

print_status "SQL script created: fix_migration.sql"
echo ""
echo "To apply this fix:"
echo "1. Connect to your Railway PostgreSQL database:"
echo "   railway connect postgres --service mdv-postgres"
echo ""
echo "2. Run the SQL commands from fix_migration.sql"
echo ""

# Step 2: Fix Frontend API URL Issue
echo "Step 2: Fixing Frontend API URL Issue"
echo "--------------------------------------"

print_warning "Frontend is using localhost:8000 instead of production API URL"
print_status "The issue is that NEXT_PUBLIC_API_URL is not being baked into the build"
echo ""

# Check if we're in the right directory
if [ ! -f "railway.json" ]; then
    print_error "Please run this script from the MDV repository root"
    exit 1
fi

# Create a build args configuration for Railway
print_status "Creating Railway build configuration to include environment variables..."

cat > railway-build-args.json << 'EOF'
{
  "build": {
    "buildArgs": {
      "NEXT_PUBLIC_API_URL": "${{NEXT_PUBLIC_API_URL}}",
      "NEXT_PUBLIC_APP_URL": "${{NEXT_PUBLIC_APP_URL}}",
      "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY": "${{NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY}}"
    }
  }
}
EOF

print_status "Build args configuration created"
echo ""

# Step 3: Update Dockerfile.web to properly handle environment variables
print_status "Updating Dockerfile.web to properly handle environment variables..."

cat > Dockerfile.web.fixed << 'EOF'
# Build Next.js web
FROM node:20-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
# Install ALL dependencies (including devDependencies) for build
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app

# IMPORTANT: Accept build args for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

# Set them as ENV for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY web ./
# Copy docs directory for API contract generation
COPY docs ../docs

# Debug: Print environment variables during build
RUN echo "Building with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# Run build (which includes prebuild for type generation)
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime environment variables (these don't affect the built code)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

# Copy standalone output if available (Next 14 standalone)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# The standalone output includes a server.js with Next server
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
EOF

print_status "Updated Dockerfile created: Dockerfile.web.fixed"
echo ""

# Step 4: Create deployment verification script
print_status "Creating deployment verification script..."

cat > verify_deployment.sh << 'EOF'
#!/bin/bash

echo "Verifying MDV Deployment"
echo "========================"

# Check API service
echo "1. Checking API service..."
API_URL=$(railway variables --service mdv-api | grep RAILWAY_PUBLIC_DOMAIN | awk '{print $3}')
if [ -n "$API_URL" ]; then
    curl -s "https://$API_URL/health" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ API service is accessible"
    else
        echo "✗ API service is not responding"
    fi
else
    echo "✗ Could not get API URL"
fi

# Check Worker service
echo "2. Checking Worker service status..."
railway logs --service mdv-worker | tail -5

# Check Web service
echo "3. Checking Web service..."
WEB_URL=$(railway variables --service mdv-web | grep RAILWAY_PUBLIC_DOMAIN | awk '{print $3}')
if [ -n "$WEB_URL" ]; then
    echo "Web URL: https://$WEB_URL"
fi

# Check environment variables
echo "4. Verifying environment variables..."
railway variables --service mdv-web | grep NEXT_PUBLIC

echo ""
echo "Deployment verification complete"
EOF

chmod +x verify_deployment.sh
print_status "Verification script created: verify_deployment.sh"
echo ""

# Step 5: Provide step-by-step instructions
echo "=========================================="
echo "DEPLOYMENT FIX INSTRUCTIONS"
echo "=========================================="
echo ""
echo "CRITICAL ISSUE #1: Database Migration"
echo "-------------------------------------"
echo "The database has an invalid migration reference. To fix:"
echo ""
echo "1. Connect to your Railway PostgreSQL database:"
echo "   ${GREEN}railway connect postgres --service mdv-postgres${NC}"
echo ""
echo "2. Run these SQL commands:"
echo "   ${GREEN}SELECT version_num FROM alembic_version;${NC}"
echo "   If it shows 'add_category_cloudinary', run:"
echo "   ${GREEN}UPDATE alembic_version SET version_num = 'c2d8e9f3a1b5';${NC}"
echo ""
echo "CRITICAL ISSUE #2: Frontend Can't Connect to API"
echo "-------------------------------------------------"
echo "The frontend is using localhost:8000 because NEXT_PUBLIC_API_URL"
echo "is not being baked into the build. To fix:"
echo ""
echo "1. Replace your Dockerfile.web with Dockerfile.web.fixed:"
echo "   ${GREEN}cp Dockerfile.web.fixed Dockerfile.web${NC}"
echo ""
echo "2. Ensure these variables are set in Railway for mdv-web service:"
echo "   - NEXT_PUBLIC_API_URL = https://mdv-api-production.up.railway.app"
echo "   - NEXT_PUBLIC_APP_URL = https://mdv-web-production.up.railway.app"
echo "   - NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = <your-public-key>"
echo ""
echo "3. Trigger a new deployment:"
echo "   ${GREEN}git add Dockerfile.web${NC}"
echo "   ${GREEN}git commit -m \"fix: Properly bake environment variables into Next.js build\"${NC}"
echo "   ${GREEN}git push${NC}"
echo ""
echo "4. Or manually redeploy in Railway:"
echo "   ${GREEN}railway up --service mdv-web${NC}"
echo ""
echo "VERIFICATION"
echo "------------"
echo "After applying fixes, run:"
echo "   ${GREEN}./verify_deployment.sh${NC}"
echo ""
echo "ROLLBACK PLAN"
echo "-------------"
echo "If issues persist:"
echo "1. Revert to previous working commit:"
echo "   ${GREEN}git revert HEAD${NC}"
echo "   ${GREEN}git push${NC}"
echo ""
echo "2. Or manually set the database migration back:"
echo "   Connect to DB and run:"
echo "   ${GREEN}UPDATE alembic_version SET version_num = 'a1f9e2c7';${NC}"
echo ""
print_warning "Remember: The mdv-web service needs to be REBUILT, not just restarted,"
print_warning "for the environment variables to take effect!"
