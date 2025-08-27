#!/usr/bin/env python3
"""
Production startup script for MDV Backend API
Handles common deployment issues and provides better error reporting
"""

import os
import sys
import asyncio
import traceback
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def log(level, message):
    """Enhanced logging with timestamps"""
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] [{level}] {message}", flush=True)

def check_environment():
    """Check required environment variables"""
    log("INFO", "Checking environment configuration...")
    
    required_vars = {
        "DATABASE_URL": "Database connection string",
        "JWT_SECRET_KEY": "JWT token secret key",
    }
    
    optional_vars = {
        "PAYSTACK_SECRET_KEY": "Paystack payment secret key",
        "APP_URL": "Frontend application URL",
        "ENV": "Environment (production/development)"
    }
    
    missing_required = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing_required.append(f"  - {var}: {description}")
    
    if missing_required:
        log("ERROR", "Missing required environment variables:")
        for var in missing_required:
            print(var)
        return False
    
    # Log configured variables (without revealing secrets)
    log("INFO", "Environment variables configured:")
    for var, description in {**required_vars, **optional_vars}.items():
        value = os.getenv(var)
        if value:
            if "SECRET" in var or "KEY" in var:
                log("INFO", f"  ✓ {var}: ****** (hidden)")
            else:
                log("INFO", f"  ✓ {var}: {value}")
        else:
            log("WARNING", f"  - {var}: Not set ({description})")
    
    return True

async def check_database():
    """Check database connectivity"""
    log("INFO", "Checking database connectivity...")
    
    try:
        from mdv.db import get_session_factory
        from sqlalchemy import text
        
        Session = get_session_factory()
        async with Session() as db:
            # Simple connectivity test
            result = await db.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            if test_value == 1:
                log("INFO", "✓ Database connectivity verified")
                return True
            else:
                log("ERROR", "Database query returned unexpected result")
                return False
                
    except Exception as e:
        log("ERROR", f"Database connectivity failed: {str(e)}")
        traceback.print_exc()
        return False

def check_imports():
    """Check that all required modules can be imported"""
    log("INFO", "Checking module imports...")
    
    required_modules = [
        "fastapi",
        "sqlalchemy", 
        "uvicorn",
        "jose",
        "passlib",
        "pydantic"
    ]
    
    missing_modules = []
    for module in required_modules:
        try:
            __import__(module)
            log("INFO", f"  ✓ {module}")
        except ImportError as e:
            log("ERROR", f"  ✗ {module}: {str(e)}")
            missing_modules.append(module)
    
    if missing_modules:
        log("ERROR", f"Missing required modules: {', '.join(missing_modules)}")
        return False
    
    return True

async def run_health_checks():
    """Run all health checks before starting the server"""
    log("INFO", "=== MDV Backend Startup Health Checks ===")
    
    checks = [
        ("Environment Variables", check_environment()),
        ("Module Imports", check_imports()),
        ("Database Connectivity", await check_database()),
    ]
    
    failed_checks = []
    for check_name, result in checks:
        if result:
            log("INFO", f"✓ {check_name}: PASSED")
        else:
            log("ERROR", f"✗ {check_name}: FAILED")
            failed_checks.append(check_name)
    
    if failed_checks:
        log("ERROR", f"Health checks failed: {', '.join(failed_checks)}")
        log("ERROR", "Cannot start server - fix the above issues first")
        return False
    
    log("INFO", "✓ All health checks passed - starting server")
    return True

def start_server():
    """Start the FastAPI server with uvicorn"""
    log("INFO", "Starting FastAPI server...")
    
    try:
        import uvicorn
        # Try multiple import paths to find the app
        app = None
        import_paths = [
            "api.main",
            "main", 
            "app"
        ]
        
        for import_path in import_paths:
            try:
                module = __import__(import_path, fromlist=['app'])
                if hasattr(module, 'app'):
                    app = module.app
                    log("INFO", f"Successfully imported app from {import_path}")
                    break
            except ImportError:
                continue
        
        if not app:
            log("ERROR", "Could not import FastAPI app - tried paths: " + ", ".join(import_paths))
            raise ImportError("Failed to import FastAPI app")
        
        # Get configuration from environment
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8000"))
        workers = int(os.getenv("WORKERS", "1"))
        
        log("INFO", f"Server configuration:")
        log("INFO", f"  Host: {host}")
        log("INFO", f"  Port: {port}")
        log("INFO", f"  Workers: {workers}")
        
        # Start the server
        uvicorn.run(
            app,
            host=host,
            port=port,
            workers=workers,
            access_log=True,
            log_level="info"
        )
        
    except Exception as e:
        log("ERROR", f"Failed to start server: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

async def main():
    """Main startup function"""
    try:
        # Run health checks
        if not await run_health_checks():
            sys.exit(1)
        
        # Start the server (this will block)
        start_server()
        
    except KeyboardInterrupt:
        log("INFO", "Server shutdown requested by user")
    except Exception as e:
        log("ERROR", f"Unexpected error during startup: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
