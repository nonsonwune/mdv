# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PostgreSQL and other dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Make start script executable
RUN chmod +x start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose the port (Railway will override this with PORT env var)
EXPOSE 8000

# Start the application using the start script
CMD ["./start.sh"]
