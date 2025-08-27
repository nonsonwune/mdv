#!/usr/bin/env python
"""
Startup script for the backend with proper error handling and async database URL conversion
"""
import os
import sys
import subprocess
import time
import traceback

def convert_to_async_url(db_url):
    """Convert standard PostgreSQL URL to asyncpg URL for async operations"""
    if not db_url:
        return db_url
    
    # If it's already an async URL, return as is
    if 'asyncpg' in db_url:
        return db_url
    
    # Convert postgresql:// to postgresql+asyncpg://
    if db_url.startswith('postgresql://'):
        return db_url.replace('postgresql://', 'postgresql+asyncpg://')
    
    # If it's postgres:// (older format), convert it
    if db_url.startswith('postgres://'):
        return db_url.replace('postgres://', 'postgresql+asyncpg://')
    
    return db_url

def convert_to_sync_url(db_url):
    """Convert asyncpg URL to sync URL for Alembic migrations"""
    if not db_url:
        return db_url
    
    # Remove asyncpg driver specification for Alembic
    if 'postgresql+asyncpg://' in db_url:
        return db_url.replace('postgresql+asyncpg://', 'postgresql://')
    
    # Handle postgres:// format
    if db_url.startswith('postgres://'):
        return db_url.replace('postgres://', 'postgresql://')
    
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
            # Get the original DATABASE_URL
            original_db_url = os.environ.get('DATABASE_URL', 'Not set')
            
            # Convert to sync URL for Alembic
            sync_db_url = convert_to_sync_url(original_db_url)
            
            print(f"Original DATABASE_URL: {original_db_url[:50]}..." if len(original_db_url) > 50 else original_db_url)
            print(f"Alembic DATABASE_URL: {sync_db_url[:50]}..." if len(sync_db_url) > 50 else sync_db_url)
            
            # Set the sync database URL for Alembic
            env = os.environ.copy()
            env['DATABASE_URL'] = sync_db_url
            
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

def setup_async_database_url():
    """Ensure DATABASE_URL is properly formatted for async operations"""
    original_db_url = os.environ.get('DATABASE_URL', '')
    
    if not original_db_url:
        print("⚠️  DATABASE_URL not set!")
        return
    
    # Convert to async URL for the application
    async_db_url = convert_to_async_url(original_db_url)
    
    if async_db_url != original_db_url:
        print(f"Converting DATABASE_URL to async format...")
        print(f"  Original: {original_db_url[:50]}...")
        print(f"  Async:    {async_db_url[:50]}...")
        os.environ['DATABASE_URL'] = async_db_url
    else:
        print(f"DATABASE_URL already in correct format")

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
            # Sanitize sensitive values but show the protocol
            if var == 'DATABASE_URL':
                # Show the protocol part to verify async configuration
                protocol = val.split('://')[0] if '://' in val else 'unknown'
                val = f"{protocol}://..." + val[30:50] + "..." if len(val) > 50 else val
            else:
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
        
        # Ensure DATABASE_URL is async before importing the app
        setup_async_database_url()
        
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
