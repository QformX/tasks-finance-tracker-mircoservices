#!/bin/bash
set -e

echo "Running Alembic migrations..."
cd /app/services/users
alembic upgrade head

echo "Starting application..."
exec "$@"

