#!/usr/bin/env python
"""
Startup script for the backend with proper error handling
"""
import os
import sys
import subprocess
import time
import traceback

def get_alembic_database_url():
    """Convert asyncpg URL to sync URL for Alembic"""
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url.startswith('postgresql+asyncpg://'):
        return db_url.replace('postgresql+asyncpg://', 'postgresql://')
    return db_url

def run_migrations():
    """Run alembic migrations with error handling and retries"""
    print("=" * 50)
    print("Running database migrations...")
    print("=" * 50)
    
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            # Print environment info
            db_url = os.environ.get('DATABASE_URL', 'Not set')
            print(f"DATABASE_URL environment variable: {db_url[:50]}..." if len(db_url) > 50 else db_url)
            
            # Set the sync database URL for Alembic
            alembic_url = get_alembic_database_url()
            env = os.environ.copy()
            env['DATABASE_URL'] = alembic_url
            
            # Try to run migrations
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                cwd="/app/backend",
                env=env
            )
            
            if result.returncode == 0:
                print("✓ Migrations completed successfully")
                print(result.stdout)
                break
            else:
                print(f"✗ Migration attempt {attempt + 1}/{max_retries} failed:")
                print("STDOUT:", result.stdout)
                print("STDERR:", result.stderr)
                if attempt < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                
        except Exception as e:
            print(f"✗ Migration error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("All migration attempts failed. Continuing without migrations...")
    
    print("=" * 50)

def print_diagnostics():
    """Print diagnostic information for debugging"""
    print("=" * 50)
    print("DIAGNOSTIC INFORMATION")
    print("=" * 50)
    
    # Environment variables (sanitized)
    env_vars = ['DATABASE_URL', 'REDIS_URL', 'PORT', 'JWT_SECRET', 'ENV']
    for var in env_vars:
        val = os.environ.get(var, 'Not set')
        if var in ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'] and val != 'Not set':
            # Sanitize sensitive values
            val = f"{val[:20]}..." if len(val) > 20 else val
        print(f"{var}: {val}")
    
    # Python path
    print(f"\nPython path: {sys.path}")
    
    # Check if backend module is importable
    try:
        import backend
        print("✓ Backend module found")
    except ImportError as e:
        print(f"✗ Backend module not found: {e}")
        
    print("=" * 50)

def start_server():
    """Start the FastAPI server with comprehensive error handling"""
    print("Starting FastAPI server...")
    
    port = os.environ.get('PORT', '8000')
    print(f"Server will listen on port: {port}")
    
    try:
        # Setup Python path
        if '/app' not in sys.path:
            sys.path.insert(0, '/app')
            print("Added /app to Python path")
        
        # Change to backend directory for proper module resolution
        os.chdir('/app/backend')
        print(f"Changed working directory to: {os.getcwd()}")
        
        print("Attempting to import uvicorn...")
        import uvicorn
        print("✓ Uvicorn imported successfully")
        
        print("Attempting to import FastAPI app...")
        from api.main import app
        print("✓ App imported successfully from api.main")
        
        print("Starting uvicorn server...")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(port),
            log_level="info",
            access_log=True
        )
    except ImportError as e:
        print(f"Import error: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"Failed to start server: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("MDV Backend Starting...")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print("=" * 50)
    
    # Print diagnostics
    print_diagnostics()
    
    # Wait a bit for database to be ready
    time.sleep(2)
    
    # Run migrations (non-blocking)
    run_migrations()
    
    # Start server (blocking)
    start_server()
