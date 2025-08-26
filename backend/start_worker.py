#!/usr/bin/env python3
"""
Worker startup script for MDV background tasks.
This script starts the Arq worker for background job processing.
"""

import os
import sys
import subprocess
import time

def print_diagnostics():
    """Print diagnostic information"""
    print("=" * 50)
    print("DIAGNOSTIC INFORMATION")
    print("=" * 50)
    
    # Environment variables
    database_url = os.environ.get('DATABASE_URL', 'Not set')
    redis_url = os.environ.get('REDIS_URL', 'Not set')
    env = os.environ.get('ENV', 'Not set')
    
    print(f"DATABASE_URL: {database_url[:50]}..." if len(database_url) > 50 else database_url)
    print(f"REDIS_URL: {redis_url[:30]}..." if len(redis_url) > 30 else redis_url)
    print(f"ENV: {env}")
    print("")
    
    # Python path
    print(f"Python path: {sys.path}")
    
    # Check if backend module is importable
    try:
        import backend
        print("✓ Backend module found")
    except ImportError as e:
        print(f"✗ Backend module not found: {e}")
        
    print("=" * 50)

def start_worker():
    """Start the Arq worker"""
    print("Starting Arq worker...")
    
    try:
        # Setup Python path
        if '/app' not in sys.path:
            sys.path.insert(0, '/app')
            print("Added /app to Python path")
        
        # Change to backend directory for proper module resolution
        os.chdir('/app/backend')
        print(f"Changed working directory to: {os.getcwd()}")
        
        print("Starting Arq worker with settings...")
        
        # Start the worker using subprocess to ensure proper module loading
        result = subprocess.run([
            sys.executable, "-m", "arq", "worker.settings.WorkerSettings"
        ], cwd="/app/backend")
        
        sys.exit(result.returncode)
        
    except Exception as e:
        print(f"Failed to start worker: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 50)
    print("MDV Worker Starting...")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    print("=" * 50)
    
    # Print diagnostics
    print_diagnostics()
    
    # Wait a bit for services to be ready
    time.sleep(2)
    
    # Start worker (blocking)
    start_worker()
