#!/bin/sh

# Use Railway's PORT environment variable, default to 8000 if not set
PORT=${PORT:-8000}

echo "Starting FastAPI app on port $PORT"

# Run uvicorn with the dynamic port
exec uvicorn api.main:app --host 0.0.0.0 --port $PORT
