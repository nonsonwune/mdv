#!/bin/bash

# Backend startup script for local development

echo "Starting MDV Backend Server..."

# Set up environment
export PYTHONPATH=/Users/mac/Repository/mdv:$PYTHONPATH
export DATABASE_URL="sqlite+aiosqlite:///./mdv_dev.db"
export REDIS_URL="memory://"
export JWT_SECRET="dev-secret-key-change-in-production"

# Activate virtual environment
source venv/bin/activate

# Start the server
echo "Starting server on http://localhost:8000"
echo "API Documentation will be available at http://localhost:8000/docs"
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
