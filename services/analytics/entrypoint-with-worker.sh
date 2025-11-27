#!/bin/bash
set -e

echo "Running Alembic migrations..."
cd /app/services/analytics
alembic upgrade head

echo "Starting worker and application..."
cd /app
python -m services.analytics.worker &
exec uvicorn services.analytics.main:app --host 0.0.0.0 --port 8000 --reload

