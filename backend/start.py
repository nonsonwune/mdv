#!/usr/bin/env python
"""
Startup script for the backend with proper error handling
"""
import os
import sys
import subprocess
import time

def run_migrations():
    """Run alembic migrations with error handling"""
    print("=" * 50)
    print("Running database migrations...")
    print("=" * 50)
    
    try:
        # Print environment info
        db_url = os.environ.get('DATABASE_URL', 'Not set')
        print(f"DATABASE_URL environment variable: {db_url[:50]}..." if len(db_url) > 50 else db_url)
        
        # Try to run migrations
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd="/app/backend"
        )
        
        if result.returncode == 0:
            print("✓ Migrations completed successfully")
            print(result.stdout)
        else:
            print("✗ Migration failed (non-critical, continuing):")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            
    except Exception as e:
        print(f"✗ Migration error (non-critical): {e}")
        print("Continuing without migrations...")
    
    print("=" * 50)

def start_server():
    """Start the FastAPI server"""
    print("Starting FastAPI server...")
    
    port = os.environ.get('PORT', '8000')
    print(f"Server will listen on port: {port}")
    
    # Import here to ensure all env vars are loaded
    import uvicorn
    from api.main import app
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(port),
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("MDV Backend Starting...")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print("=" * 50)
    
    # Wait a bit for database to be ready
    time.sleep(2)
    
    # Run migrations (non-blocking)
    run_migrations()
    
    # Start server (blocking)
    start_server()
