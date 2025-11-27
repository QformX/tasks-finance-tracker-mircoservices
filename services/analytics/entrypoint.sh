#!/bin/bash
set -e

echo "Running Alembic migrations..."
cd /app/services/analytics
alembic upgrade head

echo "Starting application..."
exec "$@"

