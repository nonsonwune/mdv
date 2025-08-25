# GitHub Actions Setup Guide

## Overview

This guide covers the complete setup of GitHub Actions CI/CD pipeline for the MDV project, including automated testing, deployment to Railway, and database backups.

## Workflows Created

### 1. **CI - Test & Validate** (`ci.yml`)
- **Triggers**: Push to main/develop, Pull requests
- **Purpose**: Run tests, security scans, and code quality checks
- **Jobs**:
  - Backend testing with PostgreSQL and Redis
  - Frontend Next.js testing and build validation
  - Docker image build validation
  - Security scanning with Trivy
  - Code quality checks (Black, Flake8, mypy)

### 2. **Deploy to Railway** (`deploy-railway.yml`)
- **Triggers**: Push to main, Manual dispatch
- **Purpose**: Automated deployment to Railway after CI passes
- **Features**:
  - Runs CI tests first
  - Deploys all services (API, Web, Worker)
  - Health checks after deployment
  - Automatic rollback on failure
  - Deployment notifications

### 3. **Database Backup** (`backup-database.yml`)
- **Triggers**: Daily at 2 AM UTC, Manual dispatch
- **Purpose**: Automated PostgreSQL backups
- **Features**:
  - Full, incremental, or schema-only backups
  - Stores in GitHub Artifacts (30 days)
  - Optional S3 storage
  - Backup integrity verification

## Required GitHub Secrets

You need to configure these secrets in your GitHub repository settings:

### Essential Secrets (Required)

1. **`RAILWAY_TOKEN`** ⚠️ REQUIRED
   - Get from Railway Dashboard → Account Settings → Tokens
   - Create a new token with full access
   - This allows GitHub Actions to deploy to Railway

2. **`RAILWAY_PROJECT_ID`** ⚠️ REQUIRED
   - Find in Railway Dashboard → Your Project → Settings
   - Copy the Project ID (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Application Secrets (For Railway Deployment)

These are set in Railway's environment variables, but you may want them in GitHub for other workflows:

3. **`PAYSTACK_PUBLIC_KEY`**
   - Your Paystack public key
   - Get from Paystack Dashboard

4. **`PAYSTACK_SECRET_KEY`**
   - Your Paystack secret key
   - Get from Paystack Dashboard

5. **`JWT_SECRET`**
   - A secure random string for JWT signing
   - Generate with: `openssl rand -hex 32`

6. **`RESEND_API_KEY`** (Optional)
   - For email notifications
   - Get from Resend.com dashboard

### Optional Secrets (For Enhanced Features)

7. **`AWS_ACCESS_KEY_ID`** (For S3 Backups)
   - AWS IAM user access key
   - Only if using S3 for backup storage

8. **`AWS_SECRET_ACCESS_KEY`** (For S3 Backups)
   - AWS IAM user secret key
   - Only if using S3 for backup storage

9. **`AWS_REGION`** (For S3 Backups)
   - AWS region (e.g., `us-east-1`)
   - Only if using S3 for backup storage

10. **`BACKUP_S3_BUCKET`** (For S3 Backups)
    - S3 bucket name for storing backups
    - Only if using S3 for backup storage

11. **`SLACK_WEBHOOK_URL`** (For Notifications)
    - Slack incoming webhook URL
    - For deployment and backup notifications

12. **`SENTRY_DSN`** (For Error Tracking)
    - Sentry project DSN
    - For production error tracking

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

### Step-by-Step for Essential Secrets

#### Getting RAILWAY_TOKEN:
1. Go to [Railway Dashboard](https://railway.app/account/tokens)
2. Click "Create Token"
3. Give it a name like "GitHub Actions"
4. Copy the token
5. Add to GitHub Secrets as `RAILWAY_TOKEN`

#### Getting RAILWAY_PROJECT_ID:
1. Go to your Railway project
2. Click Settings (gear icon)
3. Copy the Project ID
4. Add to GitHub Secrets as `RAILWAY_PROJECT_ID`

## Enabling GitHub Actions

1. **Check Actions are enabled**:
   - Go to Settings → Actions → General
   - Ensure "Actions permissions" allows actions

2. **Set up environments** (Optional but recommended):
   - Go to Settings → Environments
   - Create "production" and "staging" environments
   - Add protection rules (require reviews, restrict to main branch)

3. **Configure branch protection**:
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require status checks to pass"
   - Select CI workflows as required checks

## Testing the Workflows

### Test CI Workflow:
```bash
# Create a feature branch
git checkout -b test-ci

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI workflow"
git push origin test-ci

# Create a pull request - CI should run automatically
```

### Test Deployment Workflow:
```bash
# After setting up secrets, push to main
git checkout main
git push origin main

# Or trigger manually from GitHub Actions tab
```

### Test Backup Workflow:
1. Go to Actions tab
2. Select "Database Backup" workflow
3. Click "Run workflow"
4. Choose backup type
5. Click "Run workflow" button

## Monitoring & Troubleshooting

### Check Workflow Status:
- Go to the **Actions** tab in your repository
- Click on a workflow run to see details
- Check logs for any failures

### Common Issues:

1. **"RAILWAY_TOKEN is not set"**
   - Ensure you've added the secret to GitHub
   - Check the secret name matches exactly

2. **"Tests failing"**
   - Check if test dependencies are installed
   - Verify database migrations are up to date
   - Check environment variables in workflow

3. **"Docker build failed"**
   - Verify Dockerfile syntax
   - Check all required files are committed
   - Review build logs for specific errors

4. **"Deployment failed"**
   - Check Railway service logs
   - Verify environment variables in Railway
   - Ensure database URL format is correct

5. **"Backup failed"**
   - Verify Railway database is accessible
   - Check PostgreSQL client version compatibility
   - Ensure sufficient permissions

## Best Practices

1. **Use environments** for production deployments
2. **Enable branch protection** to require CI passes
3. **Review logs regularly** for security and performance issues
4. **Test workflows** in feature branches first
5. **Keep secrets secure** - rotate regularly
6. **Monitor costs** - GitHub Actions has usage limits

## Workflow Customization

### Adjust CI Tests:
Edit `.github/workflows/ci.yml` to:
- Add more test commands
- Change Python/Node versions
- Add different databases for testing

### Modify Deployment:
Edit `.github/workflows/deploy-railway.yml` to:
- Add staging environment
- Change deployment triggers
- Add more health checks

### Customize Backups:
Edit `.github/workflows/backup-database.yml` to:
- Change backup schedule (cron expression)
- Modify retention period
- Add different storage backends

## Cost Considerations

- **GitHub Actions**: 2,000 free minutes/month for private repos
- **Railway**: Check your plan's build minutes
- **Storage**: GitHub Artifacts are free up to 500MB

## Security Notes

1. **Never commit secrets** to the repository
2. **Use GitHub Secrets** for all sensitive data
3. **Rotate tokens regularly** (every 90 days)
4. **Limit token permissions** where possible
5. **Review workflow changes** in pull requests

## Support & Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

## Next Steps

1. ✅ Add required secrets to GitHub
2. ✅ Push changes to trigger workflows
3. ✅ Monitor first deployment
4. ✅ Set up notifications (optional)
5. ✅ Configure branch protection rules

With this setup, you have:
- **Automated testing** on every code change
- **Automated deployment** to Railway
- **Daily database backups**
- **Security scanning** for vulnerabilities
- **Code quality checks**
- **Rollback capability** on failed deployments

Your CI/CD pipeline is now production-ready! 🚀
