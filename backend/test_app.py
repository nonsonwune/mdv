#!/usr/bin/env python
"""
Minimal test app to verify Railway deployment
"""
import os
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="MDV Test API")

@app.get("/")
async def root():
    return {"message": "Test API is running", "port": os.environ.get("PORT", "unknown")}

@app.get("/health")
async def health():
    return {"status": "healthy", "env": os.environ.get("ENV", "unknown")}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting test server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
