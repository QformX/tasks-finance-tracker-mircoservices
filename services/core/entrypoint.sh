#!/bin/bash
set -e

echo "Running Alembic migrations..."
cd /app/services/core
alembic upgrade head

echo "Starting application..."
exec "$@"

