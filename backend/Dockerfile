# Production Dockerfile for BudgetBrain FastAPI Backend (Render)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render automatically binds to $PORT)
EXPOSE 8000

# Set environment variables for production
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Startup script: Run migrations and start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

