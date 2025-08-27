#!/bin/bash
set -e

echo "Starting ARQ Worker..."
echo "Current directory: $(pwd)"
echo "Python path: $PYTHONPATH"

# Set the working directory to backend
cd /app/backend

# Add backend to Python path
export PYTHONPATH="/app/backend:$PYTHONPATH"

echo "Updated Python path: $PYTHONPATH"
echo "Working directory: $(pwd)"

# Run the worker
exec python -m arq worker.main.WorkerSettings
