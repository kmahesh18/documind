#!/bin/bash
# Render startup script - binds to $PORT environment variable

# Use PORT from environment or default to 8000 for local development
PORT="${PORT:-8000}"

echo "Starting DocuMind API on port $PORT..."

exec gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:$PORT" \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --preload
